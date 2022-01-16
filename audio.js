
var soundAudio;
function setupAudio(){
    const musicAudio = new Howl({
        src:['./music/music1.mp3'],
        autoplay: true,
        loop: true,
        volume: 0.1,
    });

   const musicId =  musicAudio.play();
   musicAudio.fade(0,1,2000, musicId);

    const sounds = {};
    sounds.crash = [8000,1000];
    soundAudio = new Howl({
        src:['./music/crash.wav'],
        volume: 0.5,
        sprite: sounds,
    });

    sounds.bonus = [8000,1000];
    soundAudio = new Howl({
        src:['./music/bonus.wav'],
        volume: 0.5,
        sprite: sounds,
    });
    
}