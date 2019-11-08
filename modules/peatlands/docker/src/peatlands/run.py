from peatlands import app
import logging, argparse
from flask_cors import CORS

if __name__ == '__main__':

    parser = argparse.ArgumentParser()
    parser.add_argument('--gmaps_api_key', action='store', default='', help='Google Maps API key')
    parser.add_argument('--ee_account', action='store', default='', help='Google Earth Engine account')
    parser.add_argument('--ee_key_path', action='store', default='', help='Google Earth Engine key path')
    args, unknown = parser.parse_known_args()

    app.config['GMAPS_API_KEY'] = args.gmaps_api_key

    logging.basicConfig(level=app.config['LOGGING_LEVEL'])
    logging.getLogger('flask_cors').level = app.config['LOGGING_LEVEL']
    logging.getLogger('peatlands').level = app.config['LOGGING_LEVEL']

    try:
        from gee_gateway import gee_gateway, gee_initialize
        gee_initialize(ee_account=args.ee_account, ee_key_path=args.ee_key_path)
        #gee_gateway_cors = CORS(gee_gateway, origins=app.config['CO_ORIGINS'])
        #app.register_blueprint(gee_gateway, url_prefix='/' + app.config['GEEG_API_URL'])
    except ImportError as e:
        pass

    app.run(debug=app.config['DEBUG'], port=app.config['PORT'], host=app.config['HOST'])
