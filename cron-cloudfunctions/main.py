import webapp2
import urllib2
import os

class FireCronPage(webapp2.RequestHandler):
    def get(self):
        urldst = self.request.GET['fireurl']
        request = urllib2.Request(urldst, headers={"x-api-key" : os.environ['SHARED_INTERNAL_SECRET']})
        contents = urllib2.urlopen(request).read() #TODO: Make this request non-blocking, underlying google platform is timing out if it takes > 60s
app = webapp2.WSGIApplication([
    ('/fire', FireCronPage),
    ], debug=True)
