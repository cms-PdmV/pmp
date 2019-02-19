"""
pMp production run script
Configuration file in config.py
> sudo python run.py
"""
from flask import Flask, make_response, redirect, request
from werkzeug.contrib.cache import SimpleCache
from pmp.api.historical import HistoricalAPI
from pmp.api.performance import PerformanceAPI
from pmp.api.present import PresentAPI
from pmp.api.common import OverallAPI, SuggestionsAPI, ShortenAPI, ScreenshotAPI

import json
import config
import flask


app = Flask(__name__,
            static_url_path='',
            static_folder='./pmp')
cache = SimpleCache()


@app.errorhandler(404)
def page_not_found(error):
    """Return invalid template"""
    return make_response(open('pmp/static/build/invalid.min.html').read()), 404


def sanitize(string):
    return string.replace("\\", "")


@app.before_request
def check_cache():
    path = request.path

    if path.startswith('/api') and 'lastupdate' not in path and 'overall' not in path:
        cache_item = cache.get(request.path)

        if cache_item is not None:
            return cache_item


@app.route('/404')
def four_oh_four():
    """Redirect on 404"""
    return make_response(open('pmp/static/build/invalid.min.html').read())


@app.route('/about')
def about():
    """Redirect to Twiki"""
    return redirect('https://twiki.cern.ch/twiki/bin/viewauth/CMS/PdmVpMp',
                    code=302)


@app.route('/')
@app.route('/historical')
@app.route('/index')
@app.route('/performance')
@app.route('/present')
def dashboard():
    """Redirect to graph template"""
    return make_response(open('pmp/static/build/valid.min.html').read())

@app.route('/api/overall')
def api_overall():
    """
    API call to get statistics of pMp database
    """
    i = flask.request.args.get('r', '')
    i = sanitize(i).split(',')
    result = OverallAPI().get(i)

    return result

@app.route('/api/historical')
def api_historical():
    """API call for complex historical queries
    i - list of inputs (csv)
    granularity - int number of x datapoints
    priority - in a form of string <min_pririty,max_priority>
    status - list of statuses to include (csv)
    pwg - list of pwg to include (csv)
    """
    i = flask.request.args.get('r', '')
    granularity = flask.request.args.get('granularity', 100)
    if not isinstance(granularity, int):
        try:
            granularity = int(granularity)
        except:
            granularity = 100

    priority = flask.request.args.get('priority', None)
    if priority is not None:
        priority = priority.split(',')
        if len(priority) < 2:
            priority = None
        else:
            try:
                priority[0] = int(priority[0]) if priority[0] != '' else None
                priority[1] = int(priority[1]) if priority[1] != '' else None
            except:
                priority = None

    pwg = flask.request.args.get('pwg', None)
    if pwg is not None:
        pwg = pwg.split(',')

    status = flask.request.args.get('status', None)
    if status is not None:
        status = status.split(',')

    estimate_completed_events = flask.request.args.get('estimateCompleted', '').lower() == 'true'

    i = sanitize(i)
    result = HistoricalAPI().get(i,
                                 data_point_count=granularity,
                                 estimate_completed_events=estimate_completed_events,
                                 priority_filter=priority,
                                 pwg_filter=pwg,
                                 status_filter=status)
    # cache.add(request.path, result, timeout=config.CACHE_TIMEOUT)
    return result


@app.route('/api/performance')
def api_performance():
    i = flask.request.args.get('r', '')
    priority = flask.request.args.get('priority', None)
    if priority is not None is not None:
        priority = priority.split(',')
        if len(priority) < 2:
            priority = None
        else:
            try:
                priority[0] = int(priority[0]) if priority[0] != '' else None
                priority[1] = int(priority[1]) if priority[1] != '' else None
            except:
                priority = None

    pwg = flask.request.args.get('pwg', None)
    if pwg is not None:
        pwg = pwg.split(',')

    status = flask.request.args.get('status', None)
    if status is not None:
        status = status.split(',')

    i = sanitize(i)
    result = PerformanceAPI().get(i,
                                 priority_filter=priority,
                                 pwg_filter=pwg,
                                 status_filter=status)
    # cache.add(request.path, result, timeout=config.CACHE_TIMEOUT)
    return result


@app.route('/api/present')
def api_present():
    i = flask.request.args.get('r', '')
    priority = flask.request.args.get('priority', None)
    if priority is not None:
        priority = priority.split(',')
        if len(priority) < 2:
            priority = None
        else:
            try:
                priority[0] = int(priority[0]) if priority[0] != '' else None
                priority[1] = int(priority[1]) if priority[1] != '' else None
            except:
                priority = None

    pwg = flask.request.args.get('pwg', None)
    if pwg is not None:
        pwg = pwg.split(',')

    status = flask.request.args.get('status', None)
    if status is not None:
        status = status.split(',')

    chained_mode = flask.request.args.get('chainedMode', '').lower() == 'true'
    estimate_completed_events = flask.request.args.get('estimateCompleted', '').lower() == 'true'

    i = sanitize(i)
    result = PresentAPI().get(i,
                              chained_mode=chained_mode,
                              estimate_completed_events=estimate_completed_events,
                              priority_filter=priority,
                              pwg_filter=pwg,
                              status_filter=status)
    # cache.add(request.path, result, timeout=config.CACHE_TIMEOUT)
    return result


@app.route('/api/suggest/<string:statistics_type>/<string:fragment>')
def api_suggest(statistics_type, fragment):
    """API call for typeahead
    fragment - input string to search in db
    typeof - lifetime/growing/announced/performance
    """
    fragment = sanitize(fragment)

    result = SuggestionsAPI(statistics_type).get(fragment)
    # cache.add(request.path, result, timeout=config.CACHE_TIMEOUT)
    return result


@app.route('/api/shorten')
def api_shorten():
    """Shorten URL"""
    url = flask.request.args.get('r', None)
    if url:
        return ShortenAPI().get(url)
    else:
        return {}


@app.route('/api/screenshot', methods=['POST'])
def api_screenshot():
    """Take screenshot"""
    data = json.loads(request.data)
    return ScreenshotAPI().get(data['data'], data['ext'])


if __name__ == '__main__':
    from fetchd.utils import Utils
    Utils.setup_console_logging()
    app.run(host='0.0.0.0',
            port=config.PORT,
            debug=True,
            threaded=True,
            ssl_context=(config.CERTFILE, config.KEYFILE))

