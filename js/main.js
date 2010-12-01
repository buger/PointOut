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
            /*var data = {
              'file': {
                'name': aFile.name,
                'src': evt.target.result,
                'fileSize': aFile.fileSize,
                'type': aFile.type,
                'rotate': deg
              }
            };
            */

            // Render thumbnail template with the file info (data object).
            document.getElementById('image').src = evt.target.result;

            showWorkspace();
          };
        })(file);
 
        // Read in the image file as a data url.
        reader.readAsDataURL(file);
    });

    $('#show_demo').bind('click', function(){
        loadDemo();
    })

    WorkspaceManager.createWorkspace();
    //loadDemo();
})

function showWorkspace(){
    $('#workspace').removeClass('hidden');
    $('#start_screen').addClass('hidden');
}

function loadDemo(){
    WorkspaceManager.getActiveWorkspace().loadProject("/images/demo_image.png", 
        [
            {
                'label': '1',
                'x': 300,
                'y': 200,
                'comments': [
                    {
                        'author_name': 'ted',
                        'text': 'Test comment. This a long long long comment. bla bla bla blaaaaaaaaa.Test comment. This a long long long comment. bla bla bla blaaaaaaaaa.'
                    }
                ]
            },
            {
                'label': '2',
                'x': 250,
                'y': 400,
                'comments': [
                    {
                        'author_name': 'bob',                        
                        'text': 'Test comment 2'
                    }
                ]
            }         
        ]
    )
    
    showWorkspace();
}

