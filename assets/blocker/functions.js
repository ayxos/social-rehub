/**
 * Checks if URL should be blocked
 * @param {string}   url      browser URL in "http://www.domain.tld"" format
 * @param {function} callback Callback taking a boolean for whether URL should be blocked
 */
function checkUrl(url, callback) {
    console.log(window)
    var cleanedUrl = url.replace("www.", "").replace(/(^.*?:\/\/)/, "").replace(/(\?.*)/, "").toLowerCase();
    var domain = url.replace("www.", "").replace(/(^.*?:\/\/)/, "").replace(/\/(.*)/, "").toLowerCase();
    var onWhiteList = false;
    getWhiteList(function (whiteList) {
        console.log(cleanedUrl);
        for (var i = 0; i < whiteList.length; i++) {
            if (cleanedUrl == whiteList[i]) {
                onWhiteList = true;
            }
            console.log(whiteList[i]);
        }
        /*
        whiteList.forEach(function (val, ind, arr) {
            if (cleanedUrl == val) {
                onWhiteList = true;
            }
            console.log(val);
        });
        */
        if (!onWhiteList) {
            if (!/twitter\.com\/intent\/tweet/.test(url) && !/facebook\.com\/sharer\/sharer\.php/.test(url)) {
                getLinkList(function (urls) {
                    urls.forEach(function (val, ind, arr) {
                        if (domain == val) {
                            callback(true);
                        }
                    });
                });
            }
        }

    });

}


function isBlocked(input, callback) {
    if (input.length === 0 || !input.trim()) {
        callback(false);
    } else {
        isBlacklistedDomain(input, function (blocked) {
            isWhitelisted(input, function (unblocked) {
                callback(blocked && !unblocked);
            });
        });
    }
}

function isBlacklistedDomain(input, callback) {
    getLinkList(function (blacklist) {
        var inputURI = new URI(fixProtocol(input));
        callback(blacklist.some(function (blacklist_item) {
            var blackDomain = new URI(fixProtocol(blacklist_item)).domain();
            var blackSubDomain = new URI(fixProtocol(blacklist_item)).subdomain();
            var inputSubDomain = inputURI.subdomain();

            if (blackSubDomain.isEmpty() || blackSubDomain == "www") {
                return (blackDomain === inputURI.domain());
            } else {
                var subMatch = false;
                if (blackSubDomain + inputSubDomain == "www") {
                    subMatch = true;
                } else if (blackSubDomain == inputSubDomain) {
                    subMatch = true;
                }
                return (blackDomain === inputURI.domain() && subMatch);
            }
        }));

    });
}

function isWhitelisted(input, callback) {
    var inputURI = new URI(fixProtocol(input));
    getWhiteList(function (whitelist) {
        callback(whitelist.some(function (whitelist_item) {
            var whiteURI = new URI(fixProtocol(whitelist_item));
            if (whiteURI.domain() === inputURI.domain()) {
                //check 1 level of subdomains
                if (!whiteURI.subdomain().isEmpty() && !inputURI.subdomain().isEmpty()) {
                    var whiteSubLvlOne = whiteURI.subdomain().split('.').pop();
                    var inputSubLvlOne = inputURI.subdomain().split('.').pop();
                    //nullcheck
                    if (whiteSubLvlOne.isEmpty() || inputSubLvlOne.isEmpty()) {
                        return false;
                    }
                    return (whiteSubLvlOne === inputSubLvlOne);
                }

                //check 1 level of path
                if (!whiteURI.path().isEmpty() && !inputURI.path().isEmpty()) {
                    var whitePathLvlOne = whiteURI.path().split('/')[1];
                    var inputPathLvlOne = inputURI.path().split('/')[1];
                    //nullcheck
                    if (whitePathLvlOne.isEmpty() || whitePathLvlOne.isEmpty()) {
                        return false;
                    }
                    return (whitePathLvlOne === inputPathLvlOne);
                }
            }
            return false;
        }));
    });
}

function fixProtocol(input) {
    if (input.search(/^http[s]?\:\/\//) == -1) {
        input = 'http://' + input;
    }
    return input;
}

String.prototype.isEmpty = function () {
    return (this.length === 0 || !this.trim());
};

function buildBreakAlarms() {

    chrome.alarms.getAll(function (alarms) {

        //Clear relevant alarms
        for (var i = 0; i < alarms.length; i++) {
            var alarmName = alarms[i].name;
            if (alarmName != "pauseAlarm") {
                chrome.alarms.clear(alarmName);
            }
        }

        //Rebuild alarms
        getWhiteTime(function (breakTimes) {
            breakTimes.forEach(buildAlarm);
            chrome.alarms.getAll(function (alarms) {
                for (var i = 0; i < alarms.length; i++) {
                    var alarmName = alarms[i].name;
                    var alarmTime = alarms[i].scheduledTime;
                    var alarmPeriod = alarms[i].periodInMinutes;
                    console.log("Name: " + alarmName + " Time: " + alarmTime + " Period: " + alarmPeriod);
                }
            });
        });

    });
}



function buildAlarm(element, index, array) {
    var endHours = element.endTime[0];
    var endMinutes = element.endTime[1];
    var weekDays = element.weekDays;
    var date = new Date();
    date.setSeconds(0);
    var curWeekDay = date.getDay();
    var curTimestamp = date.getTime();
    // Hours part from the timestamp
    var curHours = date.getHours();
    // Minutes part from the timestamp
    var curMinutes = date.getMinutes();
    var curDayTimestamp = (curHours * 60 + curMinutes) * 60000;
    var breakDayTimestamp = (endHours * 60 + endMinutes) * 60000;
    var isWhiteTime = false;
    for (var i = 0; i < weekDays.length; i++) {
        if (weekDays[i] == 1) {
            var weekDay = i;
            var alarmName = "breakAlarm-" + weekDay + "-" + breakDayTimestamp;
            var alarmTime;
            if (weekDay == curWeekDay) {
                if (breakDayTimestamp >= curDayTimestamp) {
                    alarmTime = curTimestamp + breakDayTimestamp - curDayTimestamp;
                    console.log("x1");
                } else {
                    alarmTime = curTimestamp + 604800000 + breakDayTimestamp - curDayTimestamp;
                    console.log("x2");
                }
            } else if (weekDay > curWeekDay) {
                alarmTime = curTimestamp + (weekDay - curWeekDay) * 86400000 + breakDayTimestamp - curDayTimestamp;
                console.log("x3");
            } else {
                alarmTime = curTimestamp + (7 + (weekDay - curWeekDay)) * 86400000 + breakDayTimestamp - curDayTimestamp;
                console.log("x4");
            }

            //correct for 1 minute early
            alarmTime = alarmTime + 60001;

            chrome.alarms.create(alarmName, {
                when: alarmTime,
                periodInMinutes: 10080
            });
        }
    }


}

/**
 * Get the linkList data
 * @param {function} callback function with paramater that receives the option value
 */

function getLinkList(callback) {
    chrome.storage.sync.get({
        linkList: []
    }, function (items) {
        callback(items.linkList);
    });

}

/**
 * Set the linkList data
 * @param {Array}    list     Array of URLs that should be blocked
 * @param {function} callback Function with paramater that receives the new option value
 */
function setLinkList(list, callback) {
        chrome.storage.sync.set({
            linkList: list
        }, function () {
            callback();
        });
    }
    /**
     * Get the whiteList data
     * @param {function} callback function with paramater that receives the whiteList value
     */
function getWhiteList(callback) {
        chrome.storage.sync.get({
            whiteList: []
        }, function (items) {
            callback(items.whiteList);
        });

    }
    /**
     * Set the whiteList data
     * @param {Array}    list     Array of URLs that should be allowed
     * @param {function} callback Function with paramater that receives the new whiteList value
     */
function setWhiteList(list, callback) {
        chrome.storage.sync.set({
            whiteList: list
        }, function () {
            callback();
        });
    }
    /**
     * Get the blockTime data
     * @param {function} callback Function with paramater that receives the blockTime value
     */
function getBlockTime(callback) {
        chrome.storage.sync.get({
            blockTime: 0
        }, function (items) {
            callback(items.blockTime)
        });
    }
    /**
     * Set the blockTime data
     * @param {number}   time     The time that the blacklist should be paused until
     * @param {function} callback Function with paramater that receives the new blockTime value
     */
function setBlockTime(time, callback) {
        console.log(time);
        chrome.storage.sync.set({
            blockTime: time
        }, function () {
            callback();
        });
    }
    /**
     * Get the forceRefresh data
     * @param {function} callback function with paramater that receives the forceRefresh value
     */
function getForceRefresh(callback) {
        chrome.storage.sync.get({
            forceRefresh: 0
        }, function (items) {
            callback(items.forceRefresh);
        });
    }
    /**
     * Set the forceRefresh data
     * @param {number}   isForced 1 or 0 for whether refresh should be forced
     * @param {function} callback Function with paramater that receives the new forceRefresh value
     */
function setForceRefresh(isForced, callback) {
        chrome.storage.sync.set({
            forceRefresh: isForced
        }, function () {
            callback();
        });
    }
    /**
     * Get the noPause data
     * @param {function} callback function with paramater that receives the noPause value
     */
function getNoPause(callback) {
        chrome.storage.sync.get({
            noPause: 0
        }, function (items) {
            callback(items.noPause);
        });
    }
    /**
     * Set the noPause data
     * @param {number}   disablePause 1 or 0 for whether pause should be disabled
     * @param {function} callback Function with paramater that receives the new noPause value
     */
function setNoPause(disablePause, callback) {
    chrome.storage.sync.set({
        noPause: disablePause
    }, function () {
        callback();
    });
}

/**
 * Get the whiteTime data
 * @param {function} callback function with paramater that receives the option value
 */
function getWhiteTime(callback) {
        chrome.storage.sync.get({
            whiteTime: []
        }, function (items) {
            callback(items.whiteTime);
        });

    }
    /**
     * Set the WhiteTime data
     * @param {Object}    times     Array of Objects of times that should be blocked
     * @param {function} callback Function with paramater that receives the new option value
     */
function setWhiteTime(times, callback) {
    chrome.storage.sync.set({
        whiteTime: times
    }, function () {
        callback();
    });
}

function pushWhiteTime(begTime, endTime, weekDays, callback) {
    getWhiteTime(function (whiteTime) {
        whiteTime.push({
            begTime: begTime,
            endTime: endTime,
            weekDays: weekDays
        });
        setWhiteTime(whiteTime, callback);
    });
}

function stringifyWhiteTime(whiteTimeObj, callback) {
    var begHours = whiteTimeObj.begTime[0];
    var begMinutes = whiteTimeObj.begTime[1];
    var endHours = whiteTimeObj.endTime[0];
    var endMinutes = whiteTimeObj.endTime[1];
    var weekDays = whiteTimeObj.weekDays;
    if (begMinutes < 10) {
        begMinutes = "0" + begMinutes;
    }
    if (endMinutes < 10) {
        endMinutes = "0" + endMinutes;
    }
    var weekStrings = [];
    for (var i = 0; i < weekDays.length; i++) {
        if (weekDays[i] == 1) {
            switch (i) {
            case 0:
                weekStrings.push("Sunday");
                break;
            case 1:
                weekStrings.push("Monday");
                break;
            case 2:
                weekStrings.push("Tuesday");
                break;
            case 3:
                weekStrings.push("Wednesday");
                break;
            case 4:
                weekStrings.push("Thursday");
                break;
            case 5:
                weekStrings.push("Friday");
                break;
            case 6:
                weekStrings.push("Saturday");
                break;
            }
        }

    }
    var weekDaysString = weekDays.join();
    if (weekStrings.length == 1) {
        var weekString = weekStrings[0];
    } else if (weekDaysString == "0,1,1,1,1,1,0") {
        var weekString = "Weekdays"
    } else if (weekDaysString == "1,1,1,1,1,1,1") {
        var weekString = "Everyday"
    } else if (weekDaysString == "1,0,0,0,0,0,1") {
        var weekString = "Weekends"
    } else if (weekStrings.length == 2) {
        var weekString = weekStrings[0] + " and " + weekStrings[1];
    } else {
        var lastEntry = weekStrings.pop();
        var weekString = weekStrings.join(", ") + " and " + lastEntry;
    }
    var timeString = "From " + begHours + ":" + begMinutes + ", To " + endHours + ":" + endMinutes + " On " + weekString + ".";

    callback(timeString);
}

function isWhiteTimeNow(callback) {
    getWhiteTime(function (whiteTimes) {
        var date = new Date();
        var curWeekDay = date.getDay();
        var curTimestamp = date.getTime();
        // Hours part from the timestamp
        var curHours = date.getHours();
        // Minutes part from the timestamp
        var curMinutes = date.getMinutes();
        var curDaystamp = curHours * 60 + curMinutes;
        var isWhiteTime = false;

        for (var i = 0; i < whiteTimes.length; i++) {

            var whiteTime = whiteTimes[i];
            var begHours = whiteTime.begTime[0];
            var begMinutes = whiteTime.begTime[1];
            var endHours = whiteTime.endTime[0];
            var endMinutes = whiteTime.endTime[1];

            var begDaystamp = begHours * 60 + begMinutes;
            var endDaystamp = endHours * 60 + endMinutes;
            var weekDays = whiteTime.weekDays;

            if (weekDays[curWeekDay] == 1) {
                //Check if time is within boundaries
                console.log("WeekDay Pass");
                if (curDaystamp >= begDaystamp && curDaystamp <= endDaystamp) {
                    console.log("Daystamp Pass");
                    isWhiteTime = true;
                }
            }
        }

        callback(isWhiteTime);
    });
}