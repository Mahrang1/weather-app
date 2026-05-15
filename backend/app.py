print("Starting Flask app...")
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import requests
import os
import pandas as pd
from dotenv import load_dotenv
from datetime import datetime
import io
import pytz
import json

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///weather.db'
db = SQLAlchemy(app)

API_KEY = os.getenv('WEATHER_API_KEY')
BASE_URL = "https://api.openweathermap.org/data/2.5"

# ─────────────────────────────────────────
# DATABASE MODEL
# ─────────────────────────────────────────

class WeatherSearch(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    location = db.Column(db.String(100), nullable=False)
    temperature = db.Column(db.Float)
    description = db.Column(db.String(200))
    humidity = db.Column(db.Integer)
    wind_speed = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
     return {
        'id': self.id,
        'location': self.location,
        'temperature': self.temperature,
        'description': self.description,
        'humidity': self.humidity,
        'wind_speed': self.wind_speed,
        'created_at': self.created_at.strftime('%d %b %Y %I:%M %p')
    }

   

with app.app_context():
    db.create_all()

# ─────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────

def fetch_weather_data(location):
    url = f"{BASE_URL}/weather?q={location}&appid={API_KEY}&units=metric"
    response = requests.get(url, timeout=10)
    data = response.json()
    if response.status_code != 200:
        return None, data.get('message', 'Location not found')
    return data, None

# ─────────────────────────────────────────
# WEATHER ROUTES
# ─────────────────────────────────────────

@app.route('/api/weather', methods=['GET'])
def get_weather():
    location = request.args.get('location', '').strip()
    if not location:
        return jsonify({'error': 'Location is required'}), 400
    if len(location) < 2:
        return jsonify({'error': 'Please enter a valid location name (at least 2 characters)'}), 400
    try:
        data, error = fetch_weather_data(location)
        if error:
            return jsonify({'error': f'Location not found: {error}'}), 404
        weather_data = {
            'location': data['name'],
            'country': data['sys']['country'],
            'temperature': data['main']['temp'],
            'feels_like': data['main']['feels_like'],
            'description': data['weather'][0]['description'],
            'humidity': data['main']['humidity'],
            'wind_speed': data['wind']['speed'],
            'icon': data['weather'][0]['icon']
        }
        new_search = WeatherSearch(
            location=data['name'],
            temperature=data['main']['temp'],
            description=data['weather'][0]['description'],
            humidity=data['main']['humidity'],
            wind_speed=data['wind']['speed']
        )
        db.session.add(new_search)
        db.session.commit()
        return jsonify(weather_data)
    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Network error — please check your internet connection'}), 503
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timed out — please try again'}), 504
    except Exception as e:
        return jsonify({'error': f'Something went wrong: {str(e)}'}), 500


# ─────────────────────────────────────────
# DATE RANGE ROUTE
# ─────────────────────────────────────────

@app.route('/api/weather/daterange', methods=['GET'])
def get_weather_daterange():
    location = request.args.get('location', '').strip()
    start_date = request.args.get('start_date', '').strip()
    end_date = request.args.get('end_date', '').strip()

    if not location:
        return jsonify({'error': 'Location is required'}), 400
    if not start_date or not end_date:
        return jsonify({'error': 'Both start_date and end_date are required'}), 400

    try:
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    if start > end:
        return jsonify({'error': 'Start date cannot be after end date'}), 400
    if (end - start).days > 365:
        return jsonify({'error': 'Date range cannot exceed 365 days'}), 400

    try:
        data, error = fetch_weather_data(location)
        if error:
            return jsonify({'error': f'Location not found: {error}'}), 404

        new_search = WeatherSearch(
            location=data['name'],
            temperature=data['main']['temp'],
            description=data['weather'][0]['description'],
            humidity=data['main']['humidity'],
            wind_speed=data['wind']['speed'],
            start_date=start_date,
            end_date=end_date
        )
        db.session.add(new_search)
        db.session.commit()

        return jsonify({
            'location': data['name'],
            'country': data['sys']['country'],
            'temperature': data['main']['temp'],
            'description': data['weather'][0]['description'],
            'humidity': data['main']['humidity'],
            'wind_speed': data['wind']['speed'],
            'start_date': start_date,
            'end_date': end_date,
            'days': (end - start).days
        })
    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Network error — please check your internet connection'}), 503
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timed out — please try again'}), 504
    except Exception as e:
        return jsonify({'error': f'Something went wrong: {str(e)}'}), 500


@app.route('/api/forecast', methods=['GET'])
def get_forecast():
    location = request.args.get('location', '').strip()
    if not location:
        return jsonify({'error': 'Location is required'}), 400
    try:
        url = f"{BASE_URL}/forecast?q={location}&appid={API_KEY}&units=metric"
        response = requests.get(url, timeout=10)
        data = response.json()
        if response.status_code != 200:
            return jsonify({'error': 'Location not found'}), 404
        forecasts = []
        seen_dates = []
        for item in data['list']:
            date = item['dt_txt'].split(' ')[0]
            if date not in seen_dates:
                seen_dates.append(date)
                forecasts.append({
                    'date': datetime.strptime(date, '%Y-%m-%d').strftime('%d %b %Y'),
                    'temperature': item['main']['temp'],
                    'description': item['weather'][0]['description'],
                    'icon': item['weather'][0]['icon'],
                    'humidity': item['main']['humidity']
                })
            if len(forecasts) == 5:
                break
        return jsonify(forecasts)
    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Network error — please check your internet connection'}), 503
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timed out — please try again'}), 504
    except Exception as e:
        return jsonify({'error': f'Something went wrong: {str(e)}'}), 500

# ─────────────────────────────────────────
# CRUD ROUTES
# ─────────────────────────────────────────

@app.route('/api/searches', methods=['GET'])
def get_searches():
    searches = WeatherSearch.query.order_by(WeatherSearch.created_at.desc()).all()
    return jsonify([s.to_dict() for s in searches])


@app.route('/api/searches/<int:id>', methods=['PUT'])
def update_search(id):
    search = WeatherSearch.query.get_or_404(id)
    data = request.json
    new_location = data.get('location', '').strip()
    if not new_location or len(new_location) < 2:
        return jsonify({'error': 'Please enter a valid location name'}), 400
    try:
        weather_data, error = fetch_weather_data(new_location)
        if error:
            return jsonify({'error': f'Invalid location: {error}'}), 404
        search.location = weather_data['name']
        search.temperature = weather_data['main']['temp']
        search.description = weather_data['weather'][0]['description']
        search.humidity = weather_data['main']['humidity']
        search.wind_speed = weather_data['wind']['speed']
        db.session.commit()
        return jsonify({'message': 'Updated successfully', 'record': search.to_dict()})
    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Network error — please check your internet connection'}), 503
    except Exception as e:
        return jsonify({'error': f'Update failed: {str(e)}'}), 500


@app.route('/api/searches/<int:id>', methods=['DELETE'])
def delete_search(id):
    search = WeatherSearch.query.get_or_404(id)
    db.session.delete(search)
    db.session.commit()
    return jsonify({'message': 'Deleted successfully'})

# ─────────────────────────────────────────
# EXPORT ROUTES
# ─────────────────────────────────────────

@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    searches = WeatherSearch.query.all()
    data = [s.to_dict() for s in searches]
    df = pd.DataFrame(data)
    csv = df.to_csv(index=False)
    return Response(csv, mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=weather_data.csv'})


@app.route('/api/export/json', methods=['GET'])
def export_json():
    searches = WeatherSearch.query.all()
    data = [s.to_dict() for s in searches]
    return Response(json.dumps(data, indent=2), mimetype='application/json',
        headers={'Content-Disposition': 'attachment; filename=weather_data.json'})


@app.route('/api/export/xml', methods=['GET'])
def export_xml():
    searches = WeatherSearch.query.all()
    la_tz = pytz.timezone('America/Los_Angeles')
    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<weather_searches>']
    for s in searches:
        created_la = s.created_at.astimezone(la_tz)
        lines.append('  <search>')
        lines.append(f'    <id>{s.id}</id>')
        lines.append(f'    <location>{s.location}</location>')
        lines.append(f'    <temperature>{round(s.temperature, 1)}</temperature>')
        lines.append(f'    <description>{s.description}</description>')
        lines.append(f'    <humidity>{s.humidity}</humidity>')
        lines.append(f'    <wind_speed>{s.wind_speed}</wind_speed>')
        lines.append(f'    <start_date>{s.start_date or ""}</start_date>')
        lines.append(f'    <end_date>{s.end_date or ""}</end_date>')
        lines.append(f'    <created_at>{created_la.strftime("%Y-%m-%d %H:%M %p")}</created_at>')
        lines.append('  </search>')
    lines.append('</weather_searches>')
    return Response('\n'.join(lines), mimetype='application/xml',
        headers={'Content-Disposition': 'attachment; filename=weather_data.xml'})


@app.route('/api/export/markdown', methods=['GET'])
def export_markdown():
    searches = WeatherSearch.query.all()
    la_tz = pytz.timezone('America/Los_Angeles')
    lines = [
        '# Weather App — Search History',
        '',
        '**Built by Mahrang Riaz | PM Accelerator**',
        f'**Exported on:** {datetime.now(la_tz).strftime("%Y-%m-%d %H:%M")} PST',
        '',
        '| # | Location | Temp (°C) | Description | Humidity | Start Date | End Date | Searched At |',
        '|---|----------|-----------|-------------|----------|------------|----------|-------------|',
    ]
    for s in searches:
        created_la = s.created_at.astimezone(la_tz)
        lines.append(
            f'| {s.id} | {s.location} | {round(s.temperature, 1)} | {s.description} | '
            f'{s.humidity}% | {s.start_date or "—"} | {s.end_date or "—"} | '
            f'{created_la.strftime("%b %d, %Y %I:%M %p")} |'
        )
    return Response('\n'.join(lines), mimetype='text/markdown',
        headers={'Content-Disposition': 'attachment; filename=weather_data.md'})


@app.route('/api/export/pdf', methods=['GET'])
def export_pdf():
    searches = WeatherSearch.query.all()
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas as pdf_canvas

    la_tz = pytz.timezone('America/Los_Angeles')
    buffer = io.BytesIO()
    c = pdf_canvas.Canvas(buffer, pagesize=letter)

    c.setFont("Helvetica-Bold", 18)
    c.drawString(100, 760, "Weather App — Search History")
    c.setFont("Helvetica", 11)
    c.drawString(100, 740, "Built by Mahrang Riaz | PM Accelerator")
    c.drawString(100, 725, f"Exported on: {datetime.now(la_tz).strftime('%Y-%m-%d %H:%M')} PST")

    c.setFont("Helvetica-Bold", 10)
    c.drawString(40,  700, "Location")
    c.drawString(150, 700, "Temp")
    c.drawString(200, 700, "Description")
    c.drawString(330, 700, "Start Date")
    c.drawString(400, 700, "End Date")
    c.drawString(465, 700, "Searched At")
    c.line(40, 695, 570, 695)

    c.setFont("Helvetica", 9)
    y = 678
    for s in searches:
        created_la = s.created_at.astimezone(la_tz)
        c.drawString(40,  y, s.location)
        c.drawString(150, y, str(round(s.temperature, 1)))
        c.drawString(200, y, s.description[:18])
        c.drawString(330, y, s.start_date or '—')
        c.drawString(400, y, s.end_date or '—')
        c.drawString(465, y, created_la.strftime('%Y-%m-%d %H:%M'))
        y -= 18
        if y < 60:
            c.showPage()
            y = 750

    c.save()
    buffer.seek(0)
    return Response(buffer.getvalue(), mimetype='application/pdf',
        headers={'Content-Disposition': 'attachment; filename=weather_data.pdf'})


if __name__ == '__main__':
    app.run(debug=True, port=5000)