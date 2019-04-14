import bobo
import requests
import json
import random

#start server:
#bobo -f birdscooters.py 
#get scooters at latitude and longitude with the following url: (put latitude in x's and longitude in y's)
#http://localhost:8080/getscooters/xx.xxx?longitude=yyyy.yyy


@bobo.query('/getscooters/:latitude')
def hello(longitude=1, latitude=10):
    url = "https://api.bird.co/user/login"
    body = {"email": "rowdyhacks%d@gmail.com"%(random.randint(10,1200))} 
    headers={'Device-id': 'e3958b93-585d-408e-9d00-9d0aaa84328b', 'Platform': 'ios', 'Content-type': 'application/json'}
    r = requests.post(url, data=json.dumps(body), headers=headers)
    token = 0 
    print(r.text)
    if r.status_code == 200:
        token = r.json()["token"]
     
    
    lat = float(latitude)
    long = float(longitude)
    location = json.dumps({"latitude":lat,"longitude":long})
    
    authorization = "Bird " + token
    headers2 = {"Authorization": authorization,
            "Device-id": "46f7dcf4-3180-40b0-9997-37921401e8d3",
            "App-Version": "3.0.5",
            "Location": location}
    url2 = "https://api.bird.co/bird/nearby?latitude=%f&longitude=%f&radius=1000"%(lat,long)
    results = requests.get(url2, headers = headers2)
    if results.status_code == 200:
        return json.dumps(results.json()["birds"])
    else:
        return latitude
