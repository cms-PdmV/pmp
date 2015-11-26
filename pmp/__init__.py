"""Init pMp Flask app"""
import os
import sys

from flask import Flask, make_response
from werkzeug.contrib.cache import SimpleCache

app = Flask(__name__, static_url_path='')
app.config.from_object('config')

cache = SimpleCache()

@app.errorhandler(404)
def page_not_found(error):
    """Return invalid template"""
    print error
    return make_response(open('pmp/static/build/invalid.min.html').read()), 404

import pmp.views
