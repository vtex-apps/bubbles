import axios from 'axios'

const isLinked = window && window.location && window.location.hostname.match('myvtex.com')

const IMAGE_ROOT = isLinked
? `/_v/private/assets/v1/linked/${process.env.VTEX_APP_ID}/public/img`
: `https://vtexpages.vteximg.com.br/_v/public/assets/v1/published/${process.env.VTEX_APP_ID}/public/img`

function Queue(){var a=[],b=0;this.getLength=function(){return a.length-b};this.isEmpty=function(){return 0==a.length};this.enqueue=function(b){a.push(b)};this.dequeue=function(){if(0!=a.length){var c=a[b];2*++b>=a.length&&(a=a.slice(b),b=0);return c}};this.peek=function(){return 0<a.length?a[b]:void 0}};

const start = () => {
  var heatmap
  var heatmapData=[]
  var markers = []
  var images = []
  var markerInterval
  var timeConnect
  var connection
  var nextTime
  var queueImage = new Queue()
  var queueMarker = new Queue()
  var pendingMarkers = 0
  var pulseCanvas = document.querySelector('#overlay')
  var pulseContext = pulseCanvas.getContext('2d')
  var pulseResolution = 0.5
  var heatmapCanvas = document.querySelector('#heatmap')
  var heatmapContext = heatmapCanvas.getContext('2d')
  var galleryCanvas = document.querySelector('#image-gallery')
  var galleryContext = galleryCanvas.getContext('2d')
  var galleryResolution = 0.75
  var mapCanvas = document.querySelector('#map')
  var mapContext = mapCanvas.getContext('2d')
  var dayMapURL = `${IMAGE_ROOT}/world-map-2.svg`
  var nightMapURL = `${IMAGE_ROOT}/world-map-2-night.svg`

  var dayMapImage
  var nightMapImage

  // size of the map image
  var mapWidth = 1009
  var mapHeight = 665

  var mapViewBounds = {
    bottomLeft: {
      x:50,
      y:600,
    },
    topRight: {
      x:900,
      y:280,
    }
  }

  var boundsSize = {
    width: mapViewBounds.topRight.x - mapViewBounds.bottomLeft.x,
    height: mapViewBounds.bottomLeft.y - mapViewBounds.topRight.y,
  }

  var boundsRatios = {
    width: mapWidth / boundsSize.width,
    height: mapHeight / boundsSize.height,
  }
  var boundsRatio = boundsSize.width/boundsSize.height
  var windowRatio = window.innerWidth/window.innerHeight
  var mapScale
  var mapOffset

  if (windowRatio < boundsRatio) {
    mapScale = window.innerWidth / boundsSize.width
    mapOffset = {
      x: -mapViewBounds.bottomLeft.x,
      y: -mapViewBounds.topRight.y + ((window.innerHeight/mapScale) - boundsSize.height)/2,
    }
  } else {
    mapScale = window.innerHeight / boundsSize.height
    mapOffset = {
      y: -mapViewBounds.topRight.y,
      x: -mapViewBounds.bottomLeft.x + ((window.innerWidth/mapScale) - boundsSize.width)/2,
    }
  }

  // AQUI
  // document.querySelector("#world-map").style.transform = "scale("+mapScale+") translate3d("+mapOffset.x+"px, "+mapOffset.y+"px, 0)"

  // Hardcoded rates for currency conversion. We don't need the most updated and precise numbers,
  //   just a slight idea of proportions.
  var conversionRates = {
    'ARS': 0.10,
    'BRL': 1,
    'CLP': 0.0055,
    'COP': 0.0012,
    'MXN': 0.18,
    'PEN': 1.01,
    'PYG': 0.00065,
    'RON': 0.87,
    'USD': 3.81,
    'UYU': 0.12,
    'EUR': 4.34,
    'CRC': 0.0064,
    'BOB': 0.55,
    'GTQ': 0.50,
  };

  function openSocket() {
    clearInterval(timeConnect)
    clearInterval(markerInterval)

    connection.onopen = function onOpen() {
      // Connected
      console.log('Connected')
    }

    function onClose() {
      console.log('Closed')
      clearInterval(timeConnect)
      timeConnect = setInterval(openSocket, 1000)
    }

    connection.onerror = onClose
    connection.onclose = onClose

    connection.onmessage = function onMessage (msg) {
      // console.log(msg.data)
      queueMarker.enqueue(msg.data)
      nextTime = getNextTime()
    };

    markerInterval = setInterval(function handleMarkerQueue() {
      var now = new Date()
      var _nextTime = nextTime || getNextTime()
      var slots = Math.floor( (_nextTime - now.getTime()) / 2000)
      var chunk = 0

      if (slots > 0) {
        chunk = Math.ceil( queueMarker.getLength()/slots);
      }

      for (var i = chunk; i >= 0; i--) {
        moveQueue(chunk ? i*2000/chunk : 1)
      }

    }, 2000)

    function moveQueue(time) {
      pendingMarkers++
      var timeVariation=time*0.2
      setTimeout(function moveQueue() {
        if (!queueMarker.isEmpty()) {
          var markerData=queueMarker.dequeue()
          // console.log(markerData)
          renderMarkers(markerData)
          pendingMarkers--
          // console.log(pendingMarkers)
        }
      }, time + (-timeVariation + (Math.random()*timeVariation*2)))
    }

  } // End openSocket

  function connect() {
    var evtSource = new EventSource("http://ws-storedash.vtex.com/webSocket/orderStreamv2");

    evtSource.onerror = function (event) {
      alert("Couldn't connect to Storedash OrderStream evtSource.");
    };

    return evtSource;
  }

  function initialize() {
    document.getElementById('container').style.height = window.innerHeight + 'px'

    dayMapImage = new Image()
    nightMapImage = new Image()
    Promise.all([
      new Promise(function(resolve) {
        dayMapImage.addEventListener('load', function() {
          resolve(dayMapImage)
        })
      }),
      new Promise(function(resolve) {
        nightMapImage.addEventListener('load', function() {
          resolve(nightMapImage)
        })
      }),
    ]).then(function(){

      mapCanvas.setAttribute('width', window.innerWidth)
      mapCanvas.setAttribute('height', window.innerHeight)

      mapContext.save()

      mapContext.scale(mapScale, mapScale)
      mapContext.translate(mapOffset.x, mapOffset.y)
      mapContext.drawImage(dayMapImage, 0, 0)

      mapContext.save()
      var overlay = new DayNightOverlay()
      overlay.onAdd()
      overlay.draw(mapContext, mapWidth, mapHeight+300)
      mapContext.clip()
      mapContext.drawImage(nightMapImage, 0, 0)

    })
    dayMapImage.src = dayMapURL
    nightMapImage.src = nightMapURL

    function repeat(times,value){
      var i
      var array=[]
      for(i=0;i<times;i++){
        array.push(value)
      }
      return array
    }
    function getColor(alpha){
      return 'rgba(137,20,204,'+alpha+')'
    }
    function p(times,alpha){
      return repeat(times,getColor(alpha))
    }

    setTimeout(() => {
      // window.projection = map.getProjection()

      initCanvas()
    }, 4000)
  }

  function initCanvas() {
    pulseCanvas.setAttribute('width',window.innerWidth*pulseResolution)
    pulseCanvas.setAttribute('height',window.innerHeight*pulseResolution)
    pulseCanvas.style.width = window.innerWidth+'px'
    pulseCanvas.style.height = window.innerHeight+'px'
    heatmapCanvas.setAttribute('width',window.innerWidth)
    heatmapCanvas.setAttribute('height',window.innerHeight)
    galleryCanvas.setAttribute('width',window.innerWidth*galleryResolution)
    galleryCanvas.setAttribute('height',window.innerHeight*galleryResolution)
    galleryCanvas.style.width = window.innerWidth+'px'
    galleryCanvas.style.height = window.innerHeight+'px'


    var markerSpeed = 0.004
    var markerColor = '#F71963'

    var imageSpeed = 0.004

    function update() {
      pulseContext.clearRect(0,0, window.innerWidth*pulseResolution, window.innerHeight*pulseResolution)
      markers.forEach(function(marker){
        if(marker.t < 1) {
          pulseContext.fillStyle = markerColor

          pulseContext.globalAlpha = 1
          pulseContext.beginPath()
          pulseContext.arc(
            marker.x*pulseResolution, marker.y*pulseResolution,
            6*Math.pow(1-marker.t,3)*pulseResolution,
            0, 2*Math.PI
          )
          pulseContext.fill()

          var pulseT = Math.min(1,marker.t*5)

          if(pulseT < 1) {
            var pulseScale = Math.log10(Math.max(1, marker.value/200))+1
            var initialPulseSize = 70*pulseScale
            var pulseSize = initialPulseSize*Math.pow(pulseT,1/2)
            pulseContext.globalAlpha = Math.pow(1-pulseT,1/4)*0.4
            pulseContext.lineWidth = pulseSize*2*Math.pow(1-pulseT, 8)*pulseResolution
            pulseContext.strokeStyle = markerColor
            pulseContext.beginPath()
            pulseContext.arc(
              marker.x*pulseResolution, marker.y*pulseResolution,
              pulseSize*pulseResolution,
              0, 2*Math.PI
            )
            pulseContext.stroke()
          }

          marker.t += markerSpeed
        }
      })

      galleryContext.clearRect(0, 0, window.innerWidth*galleryResolution, window.innerHeight*galleryResolution)
      images.forEach(function(image, i) {
        var offset = Math.pow(image.t, 1/3) * 350
        function easeOutElastic(t, b, c, d) {
          var s=1.10158; var p=0;var a=c;
          if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.35;
          if (a < Math.abs(c)) { a=c; var s=p/4; }
          else var s = p/(2*Math.PI) * Math.asin (c/a);
          return a*Math.pow(2,-15*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
        }
        var scale = Math.max(0.1, easeOutElastic(Math.min(1,image.t*1.5), 0, 1, 1))*(1+image.scale*0.6)
        var imageSize = 70
        var origin = {
          x: window.innerWidth - 100 - (image.origin * 60),
          y: window.innerHeight + 0,
        }
        var gravity = {
          x: 0,
          y: image.t * -(window.innerHeight - 300),
        }
        var targetSize = imageSize * scale
        var oscilation = Math.sin(image.t*image.oscilationFreq*8)*image.oscilationAmp*70*(1+image.t)
        var targetPos = {
          x: origin.x+(Math.cos(image.direction)*offset)+oscilation+gravity.x,
          y: origin.y+(Math.sin(image.direction)*offset)+gravity.y,
        }

        galleryContext.fillStyle = 'white'
        galleryContext.save()
        // galleryContext.globalCompositeOperation = 'source-over'
        galleryContext.globalAlpha = 1
        galleryContext.beginPath()
        galleryContext.arc(
          targetPos.x*galleryResolution, targetPos.y*galleryResolution,
          (targetSize/2)*galleryResolution, 0, 2*Math.PI
        )
        galleryContext.fill()

        // galleryContext.beginPath()
        // galleryContext.arc(
        //   targetPos.x*galleryResolution, targetPos.y*galleryResolution,
        //   (targetSize/2)*galleryResolution, 0, 2*Math.PI
        // )
        galleryContext.clip()

        // galleryContext.globalCompositeOperation = 'source-atop'
        galleryContext.drawImage(
          image.image,
          (targetPos.x - (targetSize/2))*galleryResolution,
          (targetPos.y - (targetSize/2))*galleryResolution,
          targetSize*galleryResolution,
          targetSize*galleryResolution,
        )

        galleryContext.restore()

        var speedIncreaseFactor = 0.2
        image.t += imageSpeed + (image.speedIncrease * speedIncreaseFactor)*Math.max(0, 1-image.t*4)
        image.speedIncrease *= 1 - speedIncreaseFactor
      })
      requestAnimationFrame(function(){
        update()
      })
    }

    setInterval(function(){
      markers = markers.filter(function(marker){
        return marker.t < 1
      })
      images = images.filter(function(image){
        return image.t < 1
      }).slice(-50)
    }, 1000)

    update()
  }

  function getNextTime() {
    return new Date().getTime() + 15000
  }

  function addHeatMapPoint(x,y){
    heatmapContext.fillStyle='#00BBD4'
    // heatmapContext.fillStyle='#F71963'
    heatmapContext.globalAlpha = 0.15
    heatmapContext.beginPath()
    heatmapContext.arc(x, y, 8, 0, 2*Math.PI)
    heatmapContext.fill()

    heatmapContext.globalAlpha = 1
    heatmapContext.beginPath()
    heatmapContext.arc(x, y, 0.5+(Math.random()*1.5), 0, 2*Math.PI)
    heatmapContext.fill()
  }

  function latLngToPoint(latitude, longitude, mapWidth, mapHeight) {
    // get x value
    const x = (longitude+180)*(mapWidth/360)

    // convert from degrees to radians
    const latRad = latitude*Math.PI/180;

    // get y value
    const mercN = Math.log(Math.tan((Math.PI/4)+(latRad/2)));
    const y     = (mapHeight/2)-(mapWidth*mercN/(2*Math.PI));

    return {x: x, y: y}
  }

  function renderMarkers(data) {
    data = JSON.parse(data)

    if (data.lat != 0 && data.long != 0 && data.transactionTotal) {
      var pos = latLngToPoint(data.lat, data.long, mapWidth*mapScale, mapHeight*mapScale)
      pos.x += (-30*mapScale)+(mapOffset.x*mapScale)
      pos.y += (130*mapScale)+(mapOffset.y*mapScale)
      var variation = 3
      pos.x += -variation + (Math.random() * variation * 2)
      pos.y += -variation + (Math.random() * variation * 2)

      showImage(data.accountName, data.salesChannel, data.sku, pos.x, pos.y)
        .then(function(){
          requestAnimationFrame(function addMarkerWrapper(data) {
            return function addMarker() {
              var value = 1
              if (conversionRates[data.transactionCurrency]) {
                value = data.transactionTotal * conversionRates[data.transactionCurrency];
              } else {
                console.warn('Missing conversion rate for ' + data.transactionCurrency);
              }
              markers.push({
                x: pos.x,
                y: pos.y,
                t: 0,
                value: value,
              })

              addHeatMapPoint(pos.x, pos.y)

              if (conversionRates[data.transactionCurrency]) {
                data.transactionTotal = data.transactionTotal * conversionRates[data.transactionCurrency];
              } else {
                console.warn('Missing conversion rate for ' + data.transactionCurrency);
              }
            }
          }(data))
      })
    }
  }

  var pending = 0

  async function getImageUrl(an, sc, skuId) {
    if (pending.length > 10) return Promise.reject()

    pending++

    const response = await axios({
      method: 'get',
      url: '/api/catalog_system/pub/products/search',
      params: {
        an: an,
        sc: sc,
        timeout: 500,
        fq: `skuId:${skuId}`,
      }
    })

    const {data} = response
    const sku = data[0].items.find(({itemId}) => itemId === skuId)
    const imageUrl = sku.images && sku.images.length > 0 && sku.images[0].imageUrl

    pending--
    if (imageUrl) {
      return imageUrl
    }

    throw new Error(`Couldn't load image. an=${an} sc=${sc} skuId=${skuId}`)
  }

  function resizeImageUrl(url, size){
    if(!url) return
    var idsRegex = /\/ids\/(\d*)\//

    var ids = url.match(idsRegex)
    if(ids && ids[1]){
      ids = ids[1]
    }else{
      return url
    }

    return url.replace(idsRegex, '/ids/'+ids+'-'+size+'-'+size+'/')
  }

  var imageSpeedIncrease = 0
  function showImage(an, sc, skuId, sourceX, sourceY) {
    return new Promise(function(resolve) {
      getImageUrl(an, sc, skuId)
        .then(function(response) {
          var resizedUrl = resizeImageUrl(response, 100*galleryResolution)
          var image=new Image()
          var variation = Math.PI/18
          function onImageLoad(){
            images.forEach(image => {
              image.speedIncrease += 0.05
            })
            images.push({
              image: image,
              t: 0,
              direction: -Math.PI/2, // + (-variation + Math.random()*variation*2),
              // oscilationFreq: Math.random(),
              // oscilationAmp: Math.random(),
              oscilationFreq: 1,
              oscilationAmp: Math.random(),
              sourceX: sourceX,
              sourceY: sourceY,
              scale: Math.random(),
              origin: 1,
              speedIncrease: 0,
            })
            image.removeEventListener('load', onImageLoad)
            resolve()
          }
          image.addEventListener('load', onImageLoad)
          image.src=resizedUrl
        })
        .catch(function handleError() {
          resolve()
        })
    })
  }

  initialize()
  connection = connect();
  openSocket();

  setInterval(function reloadWindow() {
    window.location.reload(false);
  }, 900000);
}

export {
  IMAGE_ROOT,
  start
}
