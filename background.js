var goFuckingWorkURL = "http://vrachieru.github.com/go-fucking-work";

var unprodctiveURLs = [
  "9gag.com",
  "xkcd.com",
  "theoatmeal.com",
  "facebook.com",
  "500px.com"
]

chrome.webRequest.onBeforeRequest.addListener(
  function(request) {
    if (new RegExp(unprodctiveURLs.join("|")).test(request.url)) {
      return { redirectUrl : request.url = goFuckingWorkURL };
    }
  },
  {
    urls : ["<all_urls>"]
  },
  ["blocking"]
);
