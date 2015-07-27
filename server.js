var colors = require('colors');
console.log('.---------------------------.');
console.log('| *      GIT4DUMMIES        |');
console.log('.---------------------------.');
console.log('| * Starting Node service * |');
console.log('.---------------------------.');
//----Declare global vars
var http = require('http');
var request = require('request');
var fs = require('fs');
var path = require('path');
var git = require("./js/gift-sync");
var events = require('events');
var emitter = new events.EventEmitter();
var chokidar = require('chokidar');
var utf8 = require('utf8');
var watcher;
var async = require('async');
var nl2br = require('nl2br');
var exec = require('child_process').execSync;


//----load config
console.log('LOADING CONFIG:');
var path = require('path');
var baseDir = './';
var config = {};
readJSON(baseDir + '/config/config.json', function(data, err) {
    if (err) {
        console.log('There has been an error parsing');
        console.log(err);
    }
    config = data;
});

//---bind to repo
var repo = git(config.path);
/**
 * For NW
 */
// Load native UI library
var currentBranch = 'master';
var currentRemote = 'origin';
var gitworking = false;
var hasnw = true;
var autocommit = false;
var autosync = false;
var q;
var user = {};
var git_config = {};
try {
    var gui = require('nw.gui');
}
catch (e) {
    console.log("Running in node server mode");
    hasnw = false;
    autocommit = true;
    autosync = true;
}
if (hasnw) {
    // var gui = require('nw.gui'); //or global.window.nwDispatcher.requireNwGui() (see https://github.com/rogerwang/node-webkit/issues/707)
    // Get the current window
    var win = gui.Window.get();
    // Show developer console if config opendebug is true
    if (config.opendebug)
        win.showDevTools();
    //  Minimize main window
    var visible = config.startvisible;
    win.show(visible);
    //---set icon tray
    var tray;
    tray = new gui.Tray({
        title: 'git4dummies',
        icon: 'resources/git-branch.png'
    });
    tray.on('click', function() {
        visible = !visible;
        win.show(visible);
    });
    //----check if has UI
    if (Terminal != null) {
        var terminal = new Terminal('terminal', {
            prompt: "git"
        }, {
            execute: function(cmd, args) {
                switch (cmd) {
                    case 'git':
                        return
                    case 'clear':
                        terminal.clear();
                        return '';
                    case 'help':
                        return 'Commands: clear, help, theme, ver or version<br>More help available <a class="external" href="http://github.com/SDA/terminal" target="_blank">here</a>';

                    case 'theme':
                        if (args && args[0]) {
                            if (args.length > 1) return 'Too many arguments';
                            else if (args[0].match(/^interlaced|modern|white$/)) {
                                terminal.setTheme(args[0]);
                                return '';
                            }
                            else return 'Invalid theme';
                        }
                        return terminal.getTheme();

                    case 'ver':
                    case 'version':
                        return '1.0.0';

                    default:
                        repo.git(cmd, [], args, function(err, stdout) {
                            terminal.output(nl2br(stdout))
                            gitBranch();
                        })
                        return '';
                };
                
            }
        });
    }
    /**
     * listen functions
     */
    emitter.on('watcherReady', function(msg) {
        terminal.output(nl2br('\n' + msg));

    });
    emitter.on('gitStatus', function(err, status) {
        console.log('catch: gitStatus', err, status);
        terminal.output('<br/>Status:' + nl2br((status.clean) ? 'Clean' : 'Dirty'));

    });
    emitter.on('gitConfig', function(err, config) {
        console.log('catch: gitConfig', err, config);
        terminal.output('welcome:' + user.name);
    });

    emitter.on('gitBranch', function(err, branch) {
        terminal.setPrompt('git [' + branch.name + '] ');
    });
    terminal.output('<h1>GIT4DUMMIES</h1>');
}
/**
 *          BEGIN
 */

gitConfig();
processStatus();

//gitBranch(gitSync);

function queuer() {
        //----clear previous
        if (q) {
            clearTimeout(q);
            q = null
        }
        //---set interval
        q = setTimeout(processStatus, 1000);
    }
    /**
     * bind to fs events
     */
    // Full list of options. See below for descriptions.
function startWatch(path) {

    watcher = chokidar.watch(path, {
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
            log('File', path, 'has been added');
            emitter.emit('fileAdd', 'File ' + path + ' has been added');
        })
        .on('change', function(path) {
            queuer();
            log('File', path, 'has been changed');
            emitter.emit('fileChange', 'File ' + path + ' has been changed');
        })
        .on('unlink', function(path) {
            queuer();
            emitter.emit('fileUnlink', 'File ' + path + ' has been unlinked');
            log('File', path, 'has been removed');
        })
        // More events.
        .on('addDir', function(path) {
            queuer();
            emitter.emit('addDir', 'Dir ' + path + ' has been added');
            log('Directory', path, 'has been added');
        })
        .on('unlinkDir', function(path) {
            queuer();
            emitter.emit('unlinkDir', 'Dir ' + path + ' has been unlinked');
            log('Directory', path, 'has been removed');
        })
        .on('error', function(error) {
            emitter.emit('watcherErr', error);
            log('Error happened', error);
        })
        .on('ready', function() {
            msg = path + "\nInitial scan complete. Ready for changes."
            emitter.emit('watcherReady', msg);
            log(msg);
        })
        //   .on('raw', function(event, path, details) { log('Raw event info:', event, path, details); })
}

function processStatus() {

        console.log('processStatus');
        //---if listening to changes then close
        if (watcher)
            watcher.close();
        repo.git('config', [], 'core.quotepath false', function(err) {});
        gitStatus(function(err, status) {
            console.log(status);
            var queue = [];
            var msg = [];
            var doCommit = false;
            Object.keys(status.files).forEach(function(path) {
                    var st = status.files[path]
                    console.log('Pocessing: ' + path, st);
                    switch (st.type) {
                        case 'D':
                            msg.push('Removed file: ' + path)
                            gitRemove(path);
                            doCommit = true;
                            break;
                        case 'A':
                            break;
                        case 'MM':
                            break;
                        case 'AM':
                            break;
                        case 'UU':
                            //----define keep strategy as defined on config.onConfllict
                            var first = (config.onConflict == 'ours') ? 'theirs' : 'ours';
                            var second = (config.onConflict == 'ours') ? 'ours' : 'theirs';
                            var original_file = repo.path + '/' + path;
                            var parts = path.split('.');
                            if (parts.length != 1) {
                                //---insert keepPrefix before extension
                                var parts_modified = parts.splice(parts.length - 1, 0, config.keepedPrefix);
                                var modified_file = repo.path + '/' + parts_modified.join('.');

                            }
                            else {
                                //----file has no extension    
                                var modified_file = repo.path + '/' + path + '.' + config.keepedPrefix;

                            }
                            console.log('MM', modified_file);
                            //---rename conflicted file
                            console.log('checkout: --' + first + ' -- ' + path);
                            repo.git('checkout', [], '--' + first + ' -- ' + path, function(err, stdout) {
                                if (err) console.log(err);
                                console.log('Remove previous:' + modified_file);
                                console.log('Renaming:' + path + ' to ' + path + '.' + config.keepedPrefix);
                                fs.createReadStream(original_file).pipe(fs.createWriteStream(modified_file, function(err) {
                                    if (err) console.log(err);

                                }));

                                if (config.commitConflicted) {
                                    doCommit = true;
                                    console.log('add ' + path + ' --force ' + modified_file);
                                    repo.git('add', [], '--force -- ' + path + '.save', function(err) {
                                        if (err) console.log(err);

                                    });
                                }
                            });
                            //---keep file as defined in config.onConflict
                            console.log('checkout ' + path + ' -- ' + second);
                            repo.git('checkout', {}, '--' + second + ' -- ' + path, function(err) {
                                if (err) console.log(err);

                                console.log('add ' + path + ' --force ' + path);
                                repo.git('add', {}, '--force -- ' + path, function(err) {
                                    if (err) console.log(err);
                                });
                            });

                            msg.push('Conflict resolved for file: ' + original_file + ' saved ' + first + ' as ' + modified_file);

                            break;
                        default:
                            //---add untracked
                            if (!st.tracked) {
                                // msg="";
                                if (path.indexOf(config.keepedPrefix) != -1) {
                                    if (config.commitConflicted) {
                                        msg.push('Added untracked file: ' + path);
                                        doCommit = true;
                                        gitAdd(path);
                                    }
                                }
                                else {
                                    msg.push('Added untracked file: ' + path);
                                    doCommit = true;
                                    gitAdd(path);

                                }
                            }
                            break;

                    }
                    console.log('---------------------------');
                } //---end forEach
            );
            if (doCommit) {
                console.log('Make Commit ');
                repo.commit('Saved changes:\n' + msg.join('\n'), {
                    'all': true
                }, function(err) {
                    if (err) console.log(err);
                });
            }
            startWatch(repo.path);
            //process.exit();
        });
    }
    /**
     * Git commit
     */
function gitCommit(message, path, callback) {
    if (autocommit) {
        repo.add(path, function() {
            repo.commit(message, {}, function(err) {
                emitter.emit('gitCommit', err, message);
                console.log('commited:' + path);
                if (!err) {
                    if (autosync)
                        gitSync();
                }
                else {
                    console.log(err);
                }
            });
        });
    }
}

function gitBranch(name) {
        if (name) {
            repo.branch(name, function(err, branch) {
                emitter.emit('gitBranch', err, branch);
            });
        }
        else {
            repo.branch(function(err, branch) {
                emitter.emit('gitBranch', err, branch);
            });
        }
    }
    /**
     * Get git status
     */
function gitConfig(callback) {
    repo.config(
        function(err, config) {
            console.log('gitConfig');
            git_config = config;
            user.name = config.items['user.name'];
            user.email = config.items['user.email'];
            emitter.emit('gitConfig', err, config);
            repo.branch(function(err, branch) {
                terminal.output(nl2br('\nOn branch:' + branch.name));
                terminal.setPrompt('git [' + branch.name + '] ');
            })
            if (callback)
                callback(err, config);
        }
    )
}

function gitRemove(files, callback) {
        repo.remove(files,
            function(err) {
                emitter.emit('gitRemove', files, err);
                if (callback)
                    callback(err);
            });
    }
    /**
     * Get git status
     */
function gitStatus(callback) {
        repo.status(
            function(err, status) {
                console.log('gitStatus');
                var st = (status.clean) ? 'Clear'.green : 'Dirty';
                console.log('status:' + st);
                emitter.emit('gitStatus', err, status);
                if (callback)
                    callback(err, status);
            }
        )
    }
    /**
     *      Main git process here, do commits and conflict resolv
     */
function sleep(time) {
    var stop = new Date().getTime();
    while (new Date().getTime() < stop + time) {;
    }
    return;
}

/**
 * git remove file
 */
function gitRemove(path, callback) {
        console.log('Removed file: ' + path);
        repo.remove(path, function() {
            emitter.emit('gitRemove', path);
            if (callback)
                callback;
        });
    }
    /**
     * git Add file
     */
function gitAdd(path, callback) {
        console.log('Added file: ' + path);
        repo.add('"' + path + '"', function() {
            emitter.emit('gitAdd', path);
            if (callback)
                callback;
        });
    }
    /**
     * Get git branch
     */
function gitBranch(callback) {
    repo.branch(
        function(err, branch) {
            console.log(branch);
            currentBranch = branch.name;
            console.log('On branch: ' + branch.name);
            emitter.emit('gitBranch', err, branch);
            if (callback)
                callback();
        }
    )
}

/**
 * git pull
 */
function gitSync() {
    console.log('Syncing...');
    repo.sync(currentRemote, currentBranch,
        function(err) {
            if (!err) {
                console.log('Synced: ' + 'ok'.green);
                startWatch(config.path);
                emitter.emit('gitSync', err);
            }
            else {
                console.log(err);
            }
        }
    )
}

/**
 * Read a JSON file and execute a callback function
 *
 */
function readJSON(file, callback) {
    try {
        var data = fs.readFileSync(file),
            myObj;
        try {
            myObj = JSON.parse(data);
            if (callback) {
                callback(myObj, null);
            }
            else {
                return myObj;
            }
        }
        catch (err) {
            callback({}, err);
        }
    }
    catch (err) {
        callback({}, err);
    }
}