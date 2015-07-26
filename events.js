var i=0;
var chokidar = require('chokidar');
var path='/var/www/git.test';
var q;// q is the global queue control var

startWatch(path);
function theEvent(){
    i++;
    console.log('theEvent:'+i);
    clearTimeout(q);
}

function queuer(){
    //----clear previous
    if(q){
        clearTimeout(q);
    }
    //---set interval
    q=setInterval(theEvent,1000);
}
function startWatch(path) {
        var watcher = chokidar.watch(path, {
            persistent: true,
            ignored: ['.git'],
            ignoreInitial: true,
            followSymlinks: true,
            cwd: path,

            usePolling: true,
            alwaysStat: false,
            depth: undefined,
            interval: 100,

            ignorePermissionErrors: false,
            atomic: true
        });
        //---Process fs events
        var log = console.log.bind(console);
        watcher
            .on('add', function(path) {
                queuer();
            })
            .on('change', function(path) {
                queuer();
                
            })
            .on('unlink', function(path) {
                queuer();
                
            })
            // More events.
            .on('addDir', function(path) {
                queuer();
            })
            .on('unlinkDir', function(path) {
                queuer();
            })
            .on('error', function(error) {
                log('Error happened', error);
            })
            .on('ready', function() {
                log('Initial scan complete. Ready for changes.');
            })
            //   .on('raw', function(event, path, details) { log('Raw event info:', event, path, details); })
    }