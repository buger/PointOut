import os
import base64
import re
import logging

from google.appengine.ext import db
from google.appengine.ext import webapp
from google.appengine.ext import blobstore
from google.appengine.api import channel
from google.appengine.api import memcache

from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.ext.webapp import template

import simplejson as json
from jinja2 import Environment, FunctionLoader

def template_loader(name):
    fname = os.path.join(os.path.dirname(__file__), name)

    with open(name, "rb") as f:
        return f.read()

jinja_env = Environment(
        loader = FunctionLoader(template_loader),
        block_start_string = '[%',
        block_end_string = '%]',
        variable_start_string = '[[',
        variable_end_string = ']]')

#main_page_template = jinja_env.get_template('index.html')



class Project(db.Model):
    image = db.BlobProperty()
    image_content_type = db.StringProperty(indexed = False)

    creator = db.IntegerProperty()

    data = db.TextProperty()

    def channel_key(self, user_id):
        return str(self.key().id())+str(user_id)

    def connected_users(self):
        project_users = memcache.get("%s_users" % self.key())

        if project_users is None:
            project_users = []

        return project_users


    def connect_user(self, user_id):
        project_users = memcache.get("%s_users" % self.key())

        if project_users is not None:
            if project_users.count(user_id) == 0:
                project_users.append(user_id)
        else:
            project_users = [user_id]

        memcache.set("%s_users" % self.key(), project_users, 3600)

        self.broadcast_message({'action':'user_connected', 'user':str(user_id)})

        return project_users


    def broadcast_message(self, message):
        users = self.connected_users()


        for user_id in users:
            logging.info("Sending message to '%s'" % user_id)

            channel.send_message(self.channel_key(user_id), json.dumps(message))


class PointOutHandler(webapp.RequestHandler):
    def render_json(self, data):
        self.response.headers['Content-Type'] = 'application/json'
        self.response.out.write(json.dumps(data))


class RedirectToIndex(PointOutHandler):
    def get(self, project_id):
        self.redirect("/#%s" % project_id)


class LoadProject(PointOutHandler):
    def post(self, project_id):
        project = Project.get_by_id(int(project_id))
        user_id = self.request.get('user_id')

        token = channel.create_channel(project.channel_key(user_id))
        project.connect_user(int(user_id))

        if project:
            self.response.headers['Content-Type'] = 'application/json'
            self.render_json({
                'points':json.loads(project.data),
                'token':token,
                'connected_users':project.connected_users()})


class SaveProject(PointOutHandler):
    def post(self, project_id):
        project = Project.get_by_id(int(project_id))

        if project:
            project.data = self.request.get('points')
            project.put()

            message = {'method':'project_updated'}
            channel.send_message(project_id, json.dumps(message))

            self.render_json({'status':'ok'})


class CreateProject(PointOutHandler):
    dataUrlPattern = re.compile('data:(image/(png|jpeg));base64,(.*)$')

    def post(self):
        project = Project()

        imgdata = self.request.get('image')

        match = self.dataUrlPattern.match(imgdata)

        imgb64 = match.group(3)
        content_type = match.group(1)

        if imgb64 is not None and len(imgb64) > 0:
            project.image = db.Blob(base64.b64decode(imgb64))
            project.image_content_type = content_type
            project.creator = int(self.request.get('user_id'))
            project.put()

            token = channel.create_channel(project.channel_key(project.creator))

            self.render_json({'id':project.key().id(), 'token': token})


class GetImage(webapp.RequestHandler):
    def get(self, project_id):
        project = Project.get_by_id(int(project_id))

        self.response.headers['Content-Type'] = project.image_content_type
        self.response.out.write(project.image)


application = webapp.WSGIApplication(
                                     [('/create', CreateProject),
                                      ('/save/([^/]+)?', SaveProject),
                                      ('/image/([^/]+)?', GetImage),
                                      ('/load/([^/]+)?', LoadProject),
                                      ('/([^/]+)?', RedirectToIndex)],
                                     debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
