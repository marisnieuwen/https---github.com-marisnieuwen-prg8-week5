let model
let videoWidth, videoHeight
let ctx, canvas
const log = document.querySelector("#array")
const VIDEO_WIDTH = 720
const VIDEO_HEIGHT = 405


    // KNN-algoritme
const k = 3
const machine = new kNear(k)

//
// start de applicatie
//
async function main() {
    model = await handpose.load()
    const video = await setupCamera()
    video.play()
}

//
// start de webcam
//
async function setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
            "Webcam not available"
        )
    }

    const video = document.getElementById("video")
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            facingMode: "user",
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT
        }
    })
    video.srcObject = stream

    return new Promise(resolve => {
        video.onloadedmetadata = () => {
            resolve(video)
        }
    })
}

//
// predict de vinger posities in de video stream
//
async function startLandmarkDetection(video) {

    videoWidth = video.videoWidth
    videoHeight = video.videoHeight

    canvas = document.getElementById("output")

    canvas.width = videoWidth
    canvas.height = videoHeight

    ctx = canvas.getContext("2d")

    video.width = videoWidth
    video.height = videoHeight

    ctx.clearRect(0, 0, videoWidth, videoHeight)
    ctx.strokeStyle = "red"
    ctx.fillStyle = "red"

    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1) // video omdraaien omdat webcam in spiegelbeeld is

    predictLandmarks()
}

//
// predict de locatie van de vingers met het model
//
async function predictLandmarks() {
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width, canvas.height)
    // prediction!
    const predictions = await model.estimateHands(video) // ,true voor flip
    if (predictions.length > 0) {
        let [y, x, z] = predictions[0].annotations.thumb[0]
        // console.log(x, y, z)

  
        // alle landmarks x,y,z in een array plaatsen
        let allPoints = [];
        for (let i = 0; i < 21; i++) {
            allPoints.push(predictions[0].landmarks[i][0])
            allPoints.push(predictions[0].landmarks[i][1])
            allPoints.push(predictions[0].landmarks[i][2])
            // console.log(`Point ${i}: [${x}, ${y}, ${z}]`)
        }
   
        // teken de hand
        drawHand(ctx, predictions[0].landmarks, predictions[0].annotations)
    }
    // 60 keer per seconde is veel, gebruik setTimeout om minder vaak te predicten
    requestAnimationFrame(predictLandmarks)
    // setTimeout(()=>predictLandmarks(), 10)
}

//
// teken hand en vingers met de x,y coordinaten. de z waarde tekenen we niet.
//
function drawHand(ctx, keypoints, annotations) {
    // toon alle x,y,z punten van de hele hand in het log venster
    log.innerText = keypoints.flat()

    // punten op alle kootjes kan je rechtstreeks uit keypoints halen 
    for (let i = 0; i < keypoints.length; i++) {
        const y = keypoints[i][0]
        const x = keypoints[i][1]
        drawPoint(ctx, x - 2, y - 2, 3)
    }

    // palmbase als laatste punt toevoegen aan elke vinger
    let palmBase = annotations.palmBase[0]
    for (let key in annotations) {
        const finger = annotations[key]
        finger.unshift(palmBase)
        drawPath(ctx, finger, false)
    }
}

//
// teken een punt
//
function drawPoint(ctx, y, x, r) {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, 2 * Math.PI)
    ctx.fill()
}
//
// teken een lijn
//
function drawPath(ctx, points, closePath) {
    const region = new Path2D()
    region.moveTo(points[0][0], points[0][1])
    for (let i = 1; i < points.length; i++) {
        const point = points[i]
        region.lineTo(point[0], point[1])
    }

    if (closePath) {
        region.closePath()
    }
    ctx.stroke(region)
}

async function capturePose() {
    // Verkrijg de huidige pose data door predictLandmarks aan te roepen en te wachten op de uitkomst
    const predictions = await model.estimateHands(video)
    if (predictions.length > 0) {
        // Alle landmarks x,y,z in een array plaatsen
        let pose = []
        for (let i = 0; i < 21; i++) {
            pose.push(predictions[0].landmarks[i][0])
            pose.push(predictions[0].landmarks[i][1])
            pose.push(predictions[0].landmarks[i][2])
        }
        // Leer het KNN-algoritme dat deze pose een vuist is
        knn.learn(pose, "fist")
        const exampleCount = knn.getClassExampleCount()
        console.log(exampleCount)
    }
}

// Maak een "Fist" button
const fistButton = document.getElementById('fistButton');
fistButton.addEventListener("click", () => capturePose())


//
// start
//
main()