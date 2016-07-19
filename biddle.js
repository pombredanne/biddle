/*global */
/*jshint laxbreak: true*/
/*jslint node: true*/
(function biddle() {
    "use strict";
    var child     = require("child_process").exec,
        path      = require("path"),
        fs        = require("fs"),
        http      = require("http"),
        https     = require("https"),
        dir       = "",
        hash      = "",
        version   = "",
        platform  = process.platform.replace(/\s+/g, "").toLowerCase(),
        errout    = function biddle_errout(message) {
            console.log(message);
            process.exit(1);
        },
        input     = (function biddle_input() {
            var a = process.argv;
            a.splice(0, 1);
            if (a[0].indexOf("biddle") > 0) {
                a.splice(0, 1);
            }
            if (a.length < 1) {
                fs.readFile("readme.md", "utf8", function biddle_input_readme(err, readme) {
                    if (err !== null && err !== undefined) {
                        return errout(err);
                    }
                    console.log(readme);
                    process.exit(0);
                });
                a = ["", "", ""];
            }
            a[0] = a[0].toLowerCase();
            return a;
        }()),
        command   = input[0].toLowerCase(),
        fileName  = (function biddle_writeFile_fileName() {
            var paths = [];
            if (input[1] === undefined) {
                return errout("Error: unrecognized command '" + command + "'");
            }
            paths = input[1].split("/");
            if (paths[paths.length - 1].length > 0) {
                return paths[paths.length - 1];
            }
            do {
                paths.pop();
            } while (paths.length > 0 && paths[paths.length - 1] === "");
            if (paths.length < 1) {
                return "download.xxx";
            }
            return paths[paths.length - 1];
        }()),
        directory = (function biddle_directory() {
            if (typeof input[2] !== "string" || input[2].length < 1 || (/^(\s)$/).test(input[2]) === true) {
                return "";
            }
            if (input[2] !== "\\" && input[2] !== "/") {
                input[2] = input[2].replace(/(\/|\\)$/, "");
            }
            dir = process.cwd();
            fs.stat(input[2], function biddle_directory_stat(err, stats) {
                var dirs   = [],
                    ind    = 0,
                    len    = 0,
                    restat = function biggle_directory_stat_restat() {
                        fs
                            .stat(dirs.slice(0, ind + 1).join(path.sep), function biddle_directory_stat_restat_callback(erra, stata) {
                                ind += 1;
                                if ((erra !== null && erra.toString().indexOf("no such file or directory") > 0) || (typeof erra === "object" && erra !== null && erra.code === "ENOENT")) {
                                    return fs.mkdir(dirs.slice(0, ind).join(path.sep), function biddle_directory_stat_restat_callback_mkdir(errb) {
                                        if (errb !== null && errb.toString().indexOf("file already exists") < 0) {
                                            return errout(errb);
                                        }
                                        if (ind < len) {
                                            biggle_directory_stat_restat();
                                        } else {
                                            process.chdir(input[2]);
                                        }
                                    });
                                }
                                if (erra !== null && erra.toString().indexOf("file already exists") < 0) {
                                    return errout(erra);
                                }
                                if (stata.isFile() === true) {
                                    return errout("Destination directory, '" + input[2] + "', is a file.");
                                }
                                if (ind < len) {
                                    biggle_directory_stat_restat();
                                } else {
                                    process.chdir(input[2]);
                                }
                            });
                    };
                if ((err !== null && err.toString().indexOf("no such file or directory") > 0) || (typeof err === "object" && err !== null && err.code === "ENOENT")) {
                    dirs = input[2]
                        .replace(/\\/g, "/")
                        .split("/");
                    len  = dirs.length;
                    return restat();
                }
                if (err !== null && err.toString().indexOf("file already exists") < 0) {
                    return errout(err);
                }
                if (stats.isFile() === true) {
                    return errout("Destination directory, '" + input[2] + "', is a file.");
                }
            });
            return input[2];
        }()),
        hashCmd   = function biddle_hashCmd(filepath, callback) {
            var cmd = "";
            if (platform === "darwin") {
                cmd = "shasum -a 512 " + filepath;
            } else if (platform === "win32" || platform === "win64") {
                cmd = "certUtil -hashfile " + filepath + " SHA512";
            } else {
                cmd = "sha512sum " + filepath;
            }
            child(cmd, function biddle_hashCmd_exec(err, stdout, stderr) {
                if (err !== null) {
                    return errout(err);
                }
                if (stderr !== null && stderr.replace(/\s+/, "") !== "") {
                    return errout(stderr);
                }
                stdout = stdout.replace(/\s+/g, "");
                stdout = stdout.replace(filepath, "");
                stdout = stdout.replace("SHA512hashoffile:", "");
                stdout = stdout.replace("CertUtil:-hashfilecommandcompletedsuccessfully.", "");
                hash   = stdout;
                callback();
            });
        },
        tar       = function biddle_tar(compress) {
            //cjf - create bz2
            //czf - create gzip
            //xjf - unpack bz2
            //xzf - unpack gzip
            //
            //windows - "tartool2_beta/tartool.exe cjf tar_name " + filepath
            //linux   - "tar cjf tar_name " + filepath
            var app = (platform === "win32" || platform === "win64")
                    ? "tartool2_beta/tartool.exe "
                    : "tar ",
                pak = (compress === true)
                    ? "c"
                    : "x",
                opt = (compress === false && fileName.indexOf("tar.gz") > 0)
                    ? "z"
                    : "j",
                bz2 = (compress === true)
                    ? "publications" + path.sep + fileName + ".tar.bz2"
                    : "",
                spc = (compress === true)
                    ? " "
                    : "",
                cmd = app + pak + opt + "f " + bz2 + spc + input[1];
            child(cmd, function biddle_tar_child(err, stdout, stderr) {
                var callback = function biddle_tar_child_callback() {
                    if (compress === true) {
                        fs.stat(bz2, function biddle_tar_child_callback_stat(errstat, stat) {
                            if (errstat !== null) {
                                return errout(errstat);
                            }
                            //hash is updated
                            //write hash to file
                            //both hash and tar filenames must be versioned
                            console.log("File " + bz2 + " written at " + commas(stat.size) + " bytes.");
                        });
                    }
                };
                if (err !== null) {
                    return errout(err);
                }
                if (stderr !== null && stderr.replace(/\s+/, "") !== "") {
                    return errout(stderr);
                }
                hashCmd(bz2, callback);
                return stdout;
            });
        },
        commas    = function biddle_commas(number) {
            var str = String(number),
                arr = [],
                a   = str.length;
            if (a < 4) {
                return str;
            }
            arr = String(number).split("");
            a   = arr.length;
            do {
                a      -= 3;
                arr[a] = "," + arr[a];
            } while (a > 3);
            return arr.join("");
        },
        writeFile = function biddle_writeFile(fileData) {
            fs
                .writeFile("downloads" + path.sep + fileName, fileData, function biddle_writeFile_callback(err) {
                    if (err !== null) {
                        return errout(err);
                    }
                    if (command === "get") {
                        fs.stat(fileName, function biddle_writeFile_callback_getstat(errstat, stat) {
                            if (errstat !== null) {
                                return errout(errstat);
                            }
                            console.log("File " + fileName + " written at " + commas(stat.size) + " bytes.");
                        });
                    }
                    if (dir !== "") {
                        process.chdir(dir);
                    }
                });
        },
        install   = function biddle_install(fileData) {
            //child("tar ");
        },
        get       = function biddle_get(install) {
            var a        = (typeof input[1] === "string")
                    ? input[1].indexOf("s://")
                    : 0,
                file     = "",
                callback = function biddle_get_callback(res) {
                    res.setEncoding("utf8");
                    res.on("data", function biddle_get_callback_data(chunk) {
                        file += chunk;
                    });
                    res.on("end", function biddle_get_callback_end() {
                        if (install === true) {
                            install(file);
                        } else {
                            writeFile(file);
                        }
                    });
                    res.on("error", function biddle_get_callback_error(error) {
                        console.log("Error downloading file via HTTP:");
                        console.log("");
                        console.log(error);
                    });
                };
            if (a > 0 && a < 10) {
                https.get(input[1], callback);
            } else {
                http.get(input[1], callback);
            }
        };
    if (command === "get") {
        get(false);
    } else if (command === "install") {
        get(true);
    } else if (command === "publish") {
        tar(true);
    } else {
        console.log("Error: unrecognized command '" + command + "'");
    }
}());
