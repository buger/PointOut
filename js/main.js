// code yanked from the Yahoo media player. Thanks, Yahoo.
if (! ("console" in window) ) {
    var names = ["log", "debug", "info", "warn", "error", "assert", "dir", "dirxml", "group"
                 , "groupEnd", "time", "timeEnd", "count", "trace", "profile", "profileEnd"];
    window.console = {};
    for (var i = 0; i <names.length; ++i) window.console[names[i]] = function() {};
}

$(document).ready(function(){
    $('#file_uploader').bind('change', function(){
        var file = this.files[0];
        // Only process image files.
        var imageType = /image.*/;
        if (!file.type.match(imageType)) {
          return; //TODO: Display error
        }
 
        var reader = new FileReader();
     
        console.log("File: ", file);

        reader.onerror = function(e) {
           console.error('Error code: ' + e.target.error.code+' '+e.target.error.message);
           console.log(e);
        };
 
        // Create a closure to capture the file information.
        reader.onload = (function(aFile) {
          return function(evt) {
            // Render thumbnail template with the file info (data object).
            var ws = WorkspaceManager.getActiveWorkspace();
            ws.createProject(evt.target.result);

            showWorkspace();
          };
        })(file);
 
        // Read in the image file as a data url.
        reader.readAsDataURL(file);
    });

    $('#show_demo').bind('click', function(){
        $.bbq.pushState("#1");
    })

    WorkspaceManager.createWorkspace();
})

function showWorkspace(){
    $('#workspace').show()
    $('#start_screen').hide();
}


function logout(){
    FB.api({ method: 'Auth.revokeAuthorization' }, function(response) {  
        console.log("Revoke authorization response: ", response);
    });
}

function updateLoginStatus(logged){
    var ws = WorkspaceManager.getActiveWorkspace();
    
    if (logged) {       
        FB.api('/me', function(response) {          
            console.log('User info', response);

            var image = "http://graph.facebook.com/"+response.id+"/picture";

            $('#logged_user .image img')[0].src = image;
            $('#logged_user .name span').html(response.name);

            $('#logged_user').show();

            ws.user = { 
                name: response.name, 
                image: image, id: response.id,
                link: response.link
            };

            if(!ws.getConnectedUser(response.id))
                ws.users.push(ws.user);
            

            $('#fb_login_screen').hide();
            $('#background').hide();
            
            $(window).trigger('hashchange');
        });
    } else {
        $('#fb_login_screen').show();
        $('#background').show();

        $('#logged_user').hide();
        
        ws.user = {};
    }
}

