Object.prototype.keys = function(){
  var keys = [];

  for(i in this) 
      if (this.hasOwnProperty(i)) {
          keys.push(i);
      }

  return keys;
}

Object.prototype.toQueryString = function(){
    var arr = []
    var keys = this.keys();

    for(var i=0; i<keys.length; i++) {
        arr.push(encodeURIComponent(keys[i])+"="+encodeURIComponent(this[keys[i]]));
    }

    return arr.join('&');
}

/*
Ajax = {};
Ajax.emptyFunction = function(){};

Ajax.request = function(options){
    if(options.success == undefined)
        options.success = this.emptyFunction

    if(options.error == undefined)
        options.error = this.emptyFunction

    if(options.progress == undefined)
        options.progress = this.emptyFunction

    var xhr = new XMLHttpRequest();
    xhr.open(options.method, options.url, true);

    if(options.headers){
        var keys = options.headers.keys();

        for(var i=0; i<keys.length; i++){
            xhr.setRequestHeader(keys[i], options.headers[keys[i]]);
        }
    }

    xhr.onreadystatechange = function(){
        if(xhr.readyState == 4){
            if(xhr.status == 200) {
                options.success(xhr);
            } else {
                options.error(xhr);
            }
        }
    } 

    if(xhr.upload)
        xhr.upload.addEventListener('progress', function(evt){
            options.progress(evt); 
        }, false);
}
*/

PointOut = {};

PointOut.createProject = function(options){
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/create', true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    xhr.onreadystatechange = function(){
        if(xhr.readyState == 4){
            if(xhr.status == 200) {
                var data = JSON.parse(xhr.responseText);
            
                options.success(data);
            } else {
                console.error("Error while creating project:", xhr);
            }
        }
    };

    xhr.send(options.data.toQueryString());
}


PointOut.saveProject = function(options){
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/save/'+options.project_id, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

    xhr.onreadystatechange = function(){
        if(xhr.readyState == 4){
            if(xhr.status == 200) {
                console.log('Project saved');
                //var data = JSON.parse(xhr.responseText);
            
                //options.success(data);
            } else {
                console.error("Error while creating project:", xhr);
            }
        }
    };

    xhr.send(options.data.toQueryString());
}


PointOut.loadProject = function(options){
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/load/'+options.project_id, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send("user_id="+options.user_id);

    xhr.onreadystatechange = function(){
        if(xhr.readyState == 4){
            if(xhr.status == 200) {
                var data = JSON.parse(xhr.responseText);

                options.success(data);
            } else {
                console.error("Error while loading project:", xhr);
            }
        }
    };
}
