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
};

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
                author_name:'buger', 
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
        var c_idx = updated_comments[i].getAttribute('data-index');
        var c_author = updated_comments[i].getAttribute('data-author');
        var c_text = $(updated_comments[i]).find('textarea').get(0).value;
        
        var c = {
            author_name: c_author,
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
}

Workspace.prototype.renderImage = function(){
    var img = new Image();
    img.src = this.image;

    img.onload = function(){
        this.canvas.style.width = img.width+'px';
        this.canvas.style.height = img.height+'px';

        this.canvas.width = img.width;
        this.canvas.height = img.height;

        this.context.drawImage(img, 0, 0, img.width, img.height);
    }.bind(this)
}


Workspace.prototype.renderPoint = function(point, edit_comment){
    var point_for_tmpl = jQuery.extend(true, {}, point);
    point_for_tmpl.edit_comment = edit_comment;

    var point_js = point_template.tmpl(point_for_tmpl).appendTo("#workspace");

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

    return point_js;
}

Workspace.prototype.renderPoints = function(){
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

Workspace.prototype.loadProject = function(image, points){
    if(points == undefined)
        points = [];

    this.image = image;
    this.points = points;

    this.clear();

    this.renderImage();
    this.renderPoints();
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
