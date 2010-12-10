Function.prototype.bind = function(scope) {
  var _function = this;
  
  return function() {
    return _function.apply(scope, arguments);
  }
}

/*
 * Class Workspace
 *
 * Workspace#points structure:
 *   [
 *      {
 *          type:'Point',
 *          label: String, //Right now only numbers
 *          x: Number,
 *          y: Number,
 *          color: String, //blue, red, green, gray (class
 *          date_mod: Date,
 *          date_created: Date,
 *          comments: [
 *              {
 *                  type: 'Comment',
 *                  author: String, //user_id
 *                  author_name: String,
 *                  author_image: String,
 *                  text: String,
 *                  date: Date
 *              }
 *          ]
 *   ]
 */

var Workspace = function(){
    this.image = null; //url or base64 image
    this.points = []; 
    this.origin_type = 1; //0 - user upload or desktop screenshot, 1 - screenshot of web site
    this.origin_url = null; // url of site if origin_type == 1
    this.container = $('#workspace');
    
    this.canvas = document.getElementById('image_canvas');
    this.context = this.canvas.getContext('2d');

    this.user = {};

    this.users = [];
};

Workspace.prototype.saveProject = function(){
    PointOut.saveProject({ 
        project_id: this.project_id,
        data: {
            user: this.user.id,
            points: JSON.stringify(this.points)
        }
    });
}

Workspace.prototype.getLatestActivePoint = function(offset){
    if(offset == undefined)
        offset = 0;
    
    var next_point = this.points[this.points.length-1-offset];    
    if(next_point)
        if(next_point.deleted)
            return this.getLatestActivePoint(offset+1);
        else
            return next_point;
}

Workspace.prototype.getPointByLabel = function(label){
    console.info("Trying to find point with label: ", label);

    for(var i=0; i<this.points.length; i++){
        if(parseInt(this.points[i].label) == parseInt(label))
            return this.points[i];
    }
}

Workspace.prototype.addPoint = function(x,y){    
    var last_point = this.getLatestActivePoint();

    var point = {
        x:x, 
        y:y, 
        color: 'blue', 
        comments:[
            {
                author_name:this.user.name, 
                author_image: this.user.image,
                text:''
            }
        ]
    }

    if(last_point)
        point.label = parseInt(last_point.label) + 1;
    else
        point.label = '1';
    
    this.points.push(point);

    var point_js = this.renderPoint(point, 0);

    point_js.find('textarea').focus();
};

Workspace.prototype.saveActivePoints = function(){
    var active_points = $('#workspace .point.opened');

    for(var i=0; i<active_points.length; i++){
        this.savePoint(this.getPointByLabel(active_points[i].id.replace(/point_/,'')));
    }
}

Workspace.prototype.savePoint = function(point, stay_opened){
    console.info("Saving point: ", point);

    var point_js = $('#point_'+point.label);
    var updated_comments = point_js.find('.comment.edit_mode');    

    for(var i=0; i<updated_comments.length; i++){
        var c_idx =          updated_comments[i].getAttribute('data-index');
        var c_author =       updated_comments[i].getAttribute('data-author');
        var c_author_image = updated_comments[i].getAttribute('data-author-image');

        var c_text = $(updated_comments[i]).find('textarea').get(0).value;
        
        var c = {
            author_name: c_author,
            author_image: c_author_image,
            text: c_text
        }
        
        if(c_idx != undefined)
            point.comments[parseInt(c_idx)] = c;
        else
            if(c_text)
                point.comments.push(c);

        PointOut.addComment({
            project_id:this.project_id,
            data:{
                user: this.user.id,
                user_name: c.author_name,
                comment: c.text,
                image: c.author_image,
                point: point.label
            },
            success: function(){

            }
        })
    }

    point_js.remove();
    point_js = this.renderPoint(point);
    
    if(stay_opened)
        point_js.addClass('opened');
    
    if(updated_comments.length > 0)
        this.saveProject();
}

Workspace.prototype.renderImage = function(callback){
    var img = new Image();
    img.src = this.image;

    img.onload = function(){
        this.canvas.width = img.width;
        this.canvas.height = img.height;

        this.context.drawImage(img, 0, 0, img.width, img.height);
        
        if(callback)
            callback();
    }.bind(this)
}

Workspace.prototype.renderPoint = function(point, edit_comment){
    var previous_point = $('#point_'+point.label);
    if(previous_point.find('.overview').is(':visible') && edit_comment == undefined)
        edit_comment = -1
    
    console.log('previous point:', previous_point);
    previous_point.remove();

    var point_js = point_template.tmpl({edit_comment: edit_comment, point: point, user:this.user}).appendTo("#workspace");

    point_js.draggable({
        delay: 200,
        stop: function(evt){
            point.x = evt.pageX;
            point.y = evt.pageY;
        }
    })

    if(edit_comment != undefined)
        point_js.addClass('opened')

    point_js.find('.colors div').bind('click', function(){
        point.color = this.className;
        point_js.removeClass('red blue gray green').addClass(this.className);
    });

    point_js.find('.comment .delete').bind('click', function(){    
        $(this).parents('.comment').remove();            

        //If this was last comment
        if(point_js.find('.comment').length == 0){
            point.deleted = true;
            point_js.remove();
        }
    });

    point_js.find('.comment .save, .new_comment_container .submit').bind('click', function(){
        this.savePoint(point, true);
    }.bind(this));

    point_js.find('textarea.new_comment').bind('click', function(){
        if($(this).parent().hasClass('colapsed')){
            this.spellcheck = true;            
            $(this).val('').parent().removeClass('colapsed').addClass('edit_mode');

            point_js.addClass('opened');
        }
    });

    /* Comment editing disabled for better usability
     *
    point_js.find('.comment .text').bind('click', function(){
        $(this).parents('.comment').addClass('edit_mode');
        $(this).parents('.point').addClass('opened');
    });
    */

    point_js.mouseover(function(){
                this.style.zIndex = 5;
                $(this).removeClass('red');
            })
            .mouseout(function(){
                if(!$(this).hasClass('opened')) 
                    this.style.zIndex = 1;
            });

    return point_js;
}

Workspace.prototype.renderPoints = function(){
    for(var i=0; i<this.points.length; i++){
        if(this.points[i].deleted)
            continue;

        console.log("Rendering point: ", this.points[i]);
        
        this.renderPoint(this.points[i])
    }
}

Workspace.prototype.clear = function(){
    $('#workspace .point').remove();
}

Workspace.prototype.createProject = function(image, points){
    if(points == undefined)
        points = [];

    this.image = image;
    this.points = points;

    this.clear();

    this.renderImage();
    this.renderPoints();

    $('#share_link').hide();
    $('#status').show();
    
    PointOut.createProject(
        {
            data: { user_id:this.user.id, image:this.image }, 
            success: function(response){                
                console.log(response);

                this.project_id = response.id;
                
                $.bbq.pushState("#"+response.id);

                $('#share_link input').val('http://pointoutapp.appspot.com/'+this.project_id);
                $('#share_link').show();
                $('#status').hide();

                this.createChannel(response.token);
            }.bind(this),
            error: function(response){
                console.error('error!');

                this.showLoader('Ooops... Try to reload page');
            }.bind(this)
        }
    )
}

Workspace.prototype.updateProject = function(callback){
    PointOut.loadProject({
        project_id: this.project_id,
        data: {
            user_id: this.user.id,
            updating: true
        },
        success: function(response){
            this.points = response.points;

            this.renderPoints();

            if(callback)
                callback();
        }.bind(this)
    })
}

Workspace.prototype.loadProject = function(project_id){
    this.showLoader('Loading image...');

    $('#workspace').show();

    this.project_id = project_id;

    this.image = '/image/'+project_id;

    this.renderImage(function(){ 
        this.showLoader('Loading project...');

        PointOut.loadProject({
            project_id: project_id,
            data: {
                user_id: this.user.id
            },
            success: function(response){

                this.points = response.points;
            
                this.renderPoints();

                this.hideLoader();

                this.createChannel(response.token);

                for(var i=0; i<response.connected_users.length; i++){
                    this.addUser(response.connected_users[i]);
                }

                $('#share_link input').val('http://pointoutapp.appspot.com/'+this.project_id);
                $('#share_link').show();
                $('#status').hide();

            }.bind(this)
        })               
    }.bind(this));
}

Workspace.prototype.showLoader = function(text){
    $('#start_screen').hide();

    $('#big_loader').html(text).show();
    $('#background').show();
}

Workspace.prototype.hideLoader = function(){
    $('#big_loader').hide();
    $('#background').hide();
}

Workspace.prototype.createChannel = function(channel_token){
    console.log('Opening channel: ', channel_token);

    this.channel = new goog.appengine.Channel(channel_token);

    this.socket = this.channel.open();    
    this.socket.onopen = this.onChannelOpened.bind(this);
    this.socket.onmessage = this.onChannelMessage.bind(this);
    this.socket.onerror = function(msg) { 
        console.error("Socket error:", msg);
    };
    this.socket.onclose = function(){
        console.error("Socket closed");
    }
}

Workspace.prototype.onChannelOpened = function(){
    console.log('Channel opened');
}

Workspace.prototype.onChannelMessage = function(msg){
    var data = JSON.parse(msg.data);

    console.log('Message data: ', data);

    if(data.action == 'user_connected')        
        this.addUser(data.user);
    else if(data.action = 'comment_added'){
        this.updateProject(function(){                    
            $('#point_'+data.point).addClass('red');

            this.addNotification(data.image, data.text);
        }.bind(this));
    } else
        console.log("Unknown message", data.action);
}

Workspace.prototype.addUser = function(user_id){
    if(!this.getConnectedUser(user_id))
        FB.api('/'+user_id, function(response){
            var user = {
                id: response.id,
                name: response.name,
                link: response.link,
                image: "http://graph.facebook.com/"+response.id+"/picture"
            }

            this.users.push(user);

            this.addNotification(user.image, user.name+" connected");

            this.renderConnectedUsers();
        }.bind(this))

}

Workspace.prototype.renderConnectedUsers = function(){    
    var html = connected_users_template.tmpl({users:this.users, current_user:this.user});

    $('#connected_users').html(html);
}

Workspace.prototype.getConnectedUser = function(user_id){
    for(var i=0; i<this.users.length; i++)
        if(this.users[i].id == user_id)
            return this.users[i];    

    return false
}

Workspace.prototype.addNotification = function(image, text){
    var data = {image:image, text:text};

    var n = notification_template.tmpl(data).appendTo('#notifications');

    setTimeout(function(){
        n.remove();
    }, 3000)
}

// Right now it's just mock
var WorkspaceManager = {};
WorkspaceManager.workspaces = [];
WorkspaceManager.curentWorkspaceIndex = null;

WorkspaceManager.getActiveWorkspace = function(){
    return this.workspaces[this.currentWorkspaceIndex]; 
}

WorkspaceManager.createWorkspace = function(){
    this.workspaces.push(new Workspace());
    this.currentWorkspaceIndex = this.workspaces.length - 1;

    return true;
}

$(document).ready(function(){
    $('#workspace').bind('click', function(evt){
        if(evt.target.id == "image_canvas"){
            var active_points = $('#workspace .point.opened')
            
            if(active_points.length != 0)
                WorkspaceManager.getActiveWorkspace().saveActivePoints();
            else
                WorkspaceManager.getActiveWorkspace().addPoint(evt.pageX, evt.pageY);
        }
    });
});


$(function(){
    $(window).bind( 'hashchange', function(e) {
        console.log('hashchange');

        var ws = WorkspaceManager.getActiveWorkspace();

        if(!ws.user.name)
            return false;

        var project_id = parseInt($.param.fragment());
        
        if(project_id){
            if(ws.project_id != project_id)
                ws.loadProject(project_id);
        } else {
            $('#start_screen').show();
        }
    });
});
