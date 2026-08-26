// tracking.js — MediaPipe Hands (21 pontos), gestos de agarrar (mão fechada) e soltar (mão aberta).

const Tracking = (function(){

  const FINGER_TIPS = [4,8,12,16,20];
  const FINGER_PIPS = [3,6,10,14,18];

  let handsModel=null;
  let videoEl=null;
  let running=false;
  let onFrameCb=null;
  let lastHand=null;
  let prevPalm=null, prevT=0;

  const listeners = {};
  function on(evt, fn){ (listeners[evt]=listeners[evt]||[]).push(fn); }
  function emit(evt, data){ (listeners[evt]||[]).forEach(fn=>fn(data)); }

  async function init(videoElement){
    videoEl = videoElement;
    handsModel = new Hands({locateFile:(f)=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`});
    handsModel.setOptions({maxNumHands:1, modelComplexity:1, minDetectionConfidence:0.6, minTrackingConfidence:0.6});
    handsModel.onResults(onHandResults);

    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user', width:{ideal:640}, height:{ideal:480}}, audio:false});
    videoEl.srcObject = stream;
    await new Promise(res=>{
      if(videoEl.readyState>=2) res(); else videoEl.onloadedmetadata=()=>res();
    });
    return stream;
  }

  function start(frameCb){
    onFrameCb = frameCb;
    running = true;
    loop();
  }
  function stop(){ running = false; }

  async function loop(){
    if(!running) return;
    if(videoEl && videoEl.readyState>=2){
      await handsModel.send({image:videoEl});
      if(onFrameCb) onFrameCb({hand:lastHand});
    }
    requestAnimationFrame(loop);
  }

  function onHandResults(results){
    if(!results.multiHandLandmarks || !results.multiHandLandmarks.length){
      if(lastHand && !lastHand.open) emit('handOpen', {x:lastHand.x,y:lastHand.y}); // solta se perder rastreio
      lastHand = null;
      return;
    }
    const lm = results.multiHandLandmarks[0];
    const palmIdx = [0,5,9,13,17];
    let px=0, py=0;
    palmIdx.forEach(i=>{ px+=lm[i].x; py+=lm[i].y; });
    px/=palmIdx.length; py/=palmIdx.length;

    const FINGER_NAMES = ['thumb','index','middle','ring','pinky'];
    const fingers = {};
    let extended = 0;
    for(let f=1; f<5; f++){
      const isExt = lm[FINGER_TIPS[f]].y < lm[FINGER_PIPS[f]].y - 0.02;
      fingers[FINGER_NAMES[f]] = isExt;
      if(isExt) extended++;
    }
    const thumbExtended = Math.abs(lm[4].x - lm[0].x) > Math.abs(lm[3].x - lm[0].x);
    fingers.thumb = thumbExtended;
    if(thumbExtended) extended++;

    // distância polegar->cada dedo, normalizada pelo tamanho da mão, pra detectar "pinça" (toque do polegar em cada dedo)
    const p2 = (a,b)=>Math.hypot(a.x-b.x, a.y-b.y);
    const handSize = p2(lm[0], lm[9]) || 0.001;
    const pinch = {
      index:  p2(lm[4], lm[8])  < handSize*0.55,
      middle: p2(lm[4], lm[12]) < handSize*0.55,
      ring:   p2(lm[4], lm[16]) < handSize*0.55,
      pinky:  p2(lm[4], lm[20]) < handSize*0.55,
    };

    const isOpen = extended >= 3;
    const wasOpen = lastHand ? lastHand.open : true;

    const now = performance.now();
    let speed = 0;
    if(prevPalm){
      const dt = (now-prevT)/1000 || 0.016;
      speed = Math.hypot(px-prevPalm.x, py-prevPalm.y)/dt;
    }
    prevPalm = {x:px,y:py}; prevT = now;

    const mx = 1-px; // espelha x para bater com o vídeo espelhado na tela

    lastHand = {x:mx, y:py, open:isOpen, extendedCount:extended, fingers, pinch, speed};

    if(wasOpen && !isOpen) emit('handClose', {x:mx,y:py});
    if(!wasOpen && isOpen) emit('handOpen', {x:mx,y:py});
  }

  function getLastHand(){ return lastHand; }

  return { init, start, stop, on, getLastHand };
})();
