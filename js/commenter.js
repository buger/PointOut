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
 *          color: String, //#fffecf
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
};

Workspace.prototype.addComment = function(x,y){    
    var last_point = this.points[this.points.length-1];

    var point = {}

    if(last_point)
        point.label = parseInt(last_point.label) + 1;
    else
        point.label = '1';

    point.x = x;
    point.y = y;

    point.comments = [{text: 'Bla bla', author_name:'buger'}];

    this.points.push(point);

    $('#point_template').tmpl(point).appendTo("#workspace");
};

Workspace.prototype.renderImage = function(){
    document.getElementById('image').src = this.image;
}

Workspace.prototype.renderPoints = function(){
    var point_template = $('#point_template')

    for(var i in this.points){
        console.log("Rendering point: ", this.points[i]);
        
        point_template.tmpl(this.points[i]).appendTo("#workspace");
    }
}

Workspace.prototype.clear = function(){
    $('#workspace .point').remove();
}

Workspace.prototype.loadProject = function(image, points){
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
        if(evt.target.id == "image")
            WorkspaceManager.getActiveWorkspace().addComment(evt.pageX, evt.pageY);
    });
});
