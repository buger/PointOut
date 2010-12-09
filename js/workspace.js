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

Workspace.prototype.getPointByUUID = function(uuid){
    console.info("Trying to find point with uuid: ", uuid);

    for(var i=0; i<this.points.length; i++){
        if(this.points[i].uuid == uuid)
            return this.points[i];
    }
}

Workspace.prototype.addPoint = function(x,y){    
    var last_point = this.getLatestActivePoint();

    var point = {
        x:x, 
        y:y, 
        color: 'blue', 
        uuid: Math.uuidFast(), 
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
        this.savePoint(this.getPointByUUID(active_points[i].id));
    }
}

Workspace.prototype.savePoint = function(point, stay_opened){
    console.info("Saving point: ", point);

    var point_js = $('#'+point.uuid);
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
    }

    point_js.remove();
    point_js = this.renderPoint(point);
    
    if(stay_opened)
        point_js.addClass('opened');
    
    this.saveProject();
}

Workspace.prototype.renderImage = function(callback){
    var img = new Image();
    img.src = this.image;

    img.onload = function(){
        this.canvas.width = img.width;
        this.canvas.height = img.height;

        this.canvas.style.marginLeft = (-img.width/2)+'px'

        this.context.drawImage(img, 0, 0, img.width, img.height);
        
        if(callback)
            callback();
    }.bind(this)
}

Workspace.prototype.renderPoint = function(point, edit_comment){
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

    point_js.mouseover(function(){this.style.zIndex = 5})
            .mouseout(function(){
                if(!$(this).hasClass('opened')) 
                    this.style.zIndex = 1;
            });

    return point_js;
}

Workspace.prototype.renderPoints = function(){
    this.clear();

    for(var i=0; i<this.points.length; i++){
        if(this.points[i].deleted)
            continue;

        console.log("Rendering point: ", this.points[i]);

        this.points[i].uuid = Math.uuidFast();
        
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
            }.bind(this),
            error: function(response){
                console.error('error!');

                this.showLoader('Ooops... Try to reload page');
            }.bind(this)
        }
    )
}

Workspace.prototype.updateProject = function(){
    PointOut.loadProject({
        project_id: this.project_id,
        user_id: this.user.id,
        success: function(response){
            this.points = response.points;

            this.renderPoints();
        }.bind(this)
    })
}

Workspace.prototype.loadProject = function(project_id){
    this.showLoader('Loading image...');

    $('#workspace').show();

    this.project_id = project_id;

    this.image = '/image/'+project_id;

    this.renderImage(function(){ }.bind(this));

    PointOut.loadProject({
        project_id: project_id,
        user_id: this.user.id,
        success: function(response){
            console.log('Loading project:', response);

            this.points = response.points;
        
            this.renderPoints();

            this.hideLoader();

            this.createChannel(response.token);

            for(var i=0; i<response.connected_users.length; i++){
                this.addUser(response.connected_users[i]);
            }
        }.bind(this)
    })
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
    this.channel = new goog.appengine.Channel(channel_token);
    this.channel.open();

    var socket = this.channel.open();    
    socket.onopen = this.onChannelOpened.bind(this);
    socket.onmessage = this.onChannelMessage.bind(this);
    socket.onerror = function(msg) { 
        console.error("Socket error:", msg);
    };
    socket.onclose = function(){
        console.error("Socket closed");
    }
}

Workspace.prototype.onChannelOpened = function(){
    console.log('Channel opened');
}

Workspace.prototype.onChannelMessage = function(msg){
    console.log('Message data: ', msg)

    var data = JSON.parse(msg.data);

    if(data.action == 'user_connected')        
        this.addUser(user_id);
    else if(data.action = 'project_updated')
        this.updateProject();        
}

Workspace.prototype.addUser = function(user_id){
    if(!this.getConnectedUser(user_id))
        FB.api('/'+user_id, function(response){
            this.users.push({
                id: response.id,
                name: response.name,
                image: "http://graph.facebook.com/"+response.id+"/picture"
            });

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
