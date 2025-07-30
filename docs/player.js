let media="https://music.1357924680liu.dpdns.org/media/"

// Cache references to DOM elements.
let elms = ['track','artist', 'timer', 'duration','post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'progress', 'progressBar','waveCanvas', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn'];
elms.forEach(function(elm) {
  window[elm] = document.getElementById(elm);
});

let player;
let playNum=0;
let requestJson="memp.json"

let request=new XMLHttpRequest();
request.open("GET",requestJson);
request.responseType='text';
request.send();
request.onload=function(){
    jsonData=JSON.parse(request.response);
    console.log(jsonData);

    if(window.location.hash!=''){
      try{
          playNum=parseInt(window.location.hash.slice(1));
      }
      catch{
          playNum=jsonData.length-1 //默认最近添加的
      }
  }
  else{playNum=jsonData.length-1} //默认最近添加的

    player = new Player(jsonData);
}

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Player class containing the state of our playlist and where we are in it.
 * Includes all methods for playing, skipping, updating the display, etc.
 * @param {Array} playlist Array of objects with playlist song details ({title, file, howl}).
 */
let Player = function(playlist) {
  this.playlist = playlist;
  this.index = playNum;

  // Display the title of the first track.
  track.innerHTML =  playlist[this.index].title;
  artist.innerHTML =  playlist[this.index].artist;
  document.querySelector("body").style.backgroundImage = "url('" +media+ encodeURI(playlist[this.index].pic) + "')";
  post.innerHTML = '<p><b>'+playlist[this.index].date+'</b></p>' + playlist[this.index].article;
  document.querySelector('meta[property="og:image"]').setAttribute('content', media+ encodeURI(playlist[this.index].pic));

  // Setup the playlist display.
  playlist.forEach(function(song) {
    let div = document.createElement('div');
    div.className = 'list-song';
    div.id = 'list-song-'+playlist.indexOf(song);
    div.innerHTML = song.title + ' - ' + song.artist;
    div.onclick = function() {
      player.skipTo(playlist.indexOf(song));
    };
    list.appendChild(div);
  });
};

// 扩展Player原型，添加歌词功能
Player.prototype = {
  /**
   * Play a song in the playlist.
   * @param  {Number} index Index of the song in the playlist (leave empty to play the first or current).
   */
  play: function(index) {
    let self = this;
    let sound;

    index = typeof index === 'number' ? index : self.index;
    let data = self.playlist[index];

    // If we already loaded this track, use the current one.
    // Otherwise, setup and load a new Howl.
    if (data.howl) {
      sound = data.howl;
    } else {
      sound = data.howl = new Howl({
        src: [media + data.mp3],
        html5: isMobile(), // Force to HTML5 so that the audio can stream in (best for large files).
        onplay: function() {
          // Display the duration.
          duration.innerHTML = self.formatTime(Math.round(sound.duration()));

          // Start updating the progress of the track.
          requestAnimationFrame(self.step.bind(self));

          // Start the wave animation if we have already loaded
          progressBar.style.display = 'block';
          pauseBtn.style.display = 'block';

          // Load and display lyrics if available
          if (data.lyric) {
            self.loadLyrics(data);
          }
        },
        onload: function() {
          // Start the wave animation.
          progressBar.style.display = 'block';
          loading.style.display = 'none';
        },
        onend: function() {
          // Stop the wave animation.
          self.skip('next');
        },
        onpause: function() {
          // Stop the wave animation.
          progressBar.style.display = 'none';
        },
        onstop: function() {
          // Stop the wave animation.
          progressBar.style.display = 'none';
        },
        onseek: function() {
          // Start updating the progress of the track.
          requestAnimationFrame(self.step.bind(self));
        }
      });
    }

    // Show lyrics if enabled by default on play
    if (data.lyric) {
      document.getElementById('showLyrics').checked = true;
    }

    // Begin playing the sound.
    sound.play();

    // 手机系统控制映射
    if ('mediaSession' in navigator) {
      const artworkUrl = media + encodeURI(data.pic);
      const img = new Image();

      const applyMediaSession = (artwork) => {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: data.title,
          artist: data.artist,
          album: '',
          artwork: artwork ? [artwork] : []
        });
    
        navigator.mediaSession.setActionHandler('play', () => {
          const sound = self.playlist[self.index].howl;
          sound.play();
          navigator.mediaSession.playbackState = 'playing';
          playBtn.style.display = 'none';
          pauseBtn.style.display = 'block';
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          const sound = self.playlist[self.index].howl;
          sound.pause();
          navigator.mediaSession.playbackState = 'paused';
          playBtn.style.display = 'block';
          pauseBtn.style.display = 'none';
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => { self.skip('prev'); });
        navigator.mediaSession.setActionHandler('nexttrack', () => { self.skip('next'); });
      };

      //默认无图片
      applyMediaSession(null); 

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const targetSize = 512;
        canvas.width = targetSize;
        canvas.height = targetSize;
    
        // 计算裁剪区域（居中裁剪）
        const sourceSize = Math.min(img.width, img.height);
        const sx = (img.width - sourceSize) / 2;
        const sy = (img.height - sourceSize) / 2;
    
        // 绘制并裁剪图片
        ctx.drawImage(img,sx, sy,sourceSize, sourceSize,0, 0,targetSize, targetSize);

        // 转换为 Data URL（JPEG 格式，质量 90%）
        const croppedUrl = canvas.toDataURL('image/jpeg', 0.9);
    
        // 传递给我们 MediaSession
        applyMediaSession({src: croppedUrl,sizes: `${targetSize}x${targetSize}`,type: 'image/jpeg'});
      };
    
      img.onerror = (err) => {console.warn("图片加载失败，继续使用无图片：", artworkUrl, err);};
      img.crossOrigin = 'Anonymous';
      img.src = artworkUrl;
    }

    // Update the track display.
    track.innerHTML = data.title;
    artist.innerHTML =  data.artist;
    post.innerHTML = '<p><b>'+data.date+'</b></p>'+data.article;
    document.title=data.title + " - Gmemp";//显示浏览器TAB栏内容
    document.querySelector("body").style.backgroundImage = "url('" +media+ encodeURI(data.pic) + "')";
    window.location.hash="#"+(index);

    document.querySelector('meta[property="og:title"]').setAttribute('content', data.title);
    document.querySelector('meta[property="og:description"]').setAttribute('content', data.article);
    document.querySelector('meta[property="og:url"]').setAttribute('content', window.location.href);
    document.querySelector('meta[property="og:image"]').setAttribute('content', media+ encodeURI(data.pic));

    //progressBar 垂直居中
    progressBar.style.margin = -(window.innerHeight*0.3/2)+'px auto'

    document.querySelector('#list-song-'+playNum).style.backgroundColor='';//清除上一首选中
    document.querySelector('#list-song-'+index).style.backgroundColor='rgba(255, 255, 255, 0.1)';//高亮当前播放
    playNum=index;
    
    //https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
    this.analyser=Howler.ctx.createAnalyser();
    this.analyser.fftSize = Math.pow(2, Math.floor(Math.log2((window.innerWidth / 15) * 2)));
    this.bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(this.bufferLength);
    Howler.masterGain.connect(this.analyser);
    draw();

    // Show wave button if there are audio effects
    if (Howler.ctx) {
      waveBtn.style.display = 'block';
    }

    // Show the pause button.
    if (sound.state() === 'loaded') {
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'block';
    } else {
      loading.style.display = 'block';
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'none';
    }

    // Load lyrics if enabeled
    if(data.lyric && document.getElementById('showLyrics').checked) {
      self.loadLyrics(data);
    }

    // Keep track of the index we are currently playing.
    self.index = index;
  },

  // 添加歌词相关功能
  loadLyrics(song) {
    let self = this;
    // 获取歌词切换开关状态
    const showLyrics = document.getElementById('showLyrics').checked;
    
    if (!showLyrics) {
      // 如果歌词显示已关闭，跳过加载
      console.log("Lyrics display is off. Skipping lyrics loading.");
      return;
    }

    if (!song.lyric || typeof song.lyric !== 'string' || song.lyric.trim() === '') {
      console.log("No valid lyric file specified for this song.");
      return;
    }
    
    if (self.lyricInterval) {
      clearInterval(self.lyricInterval);
    }
    
    // 解释歌词文件URL
    let lyricUrl = song.lyric;
    let toFetch = [];
    
    // 如果是相对URL，转换为完整URL
    if (media) {
      lyricUrl = media + song.lyric;
    }
    
    console.log("Loading lyrics from:", lyricUrl);
    
    fetch(lyricUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.text();
      })
      .then(text => {
        try {
          self.lyricsData = self.parseSRT(text);
          self.displayLyrics();
        } catch (error) {
          console.error("Error parsing lyrics:", error);
        }
      })
      .catch(error => {
        console.error("Error loading lyrics:", error);
        alert("错误: " + error.message);
      });
  },
  
  parseSRT(data) {
    // 解析SRT歌词格式
    const blocks = data.trim().split(/\n\n/);
    const result = [];
    
    blocks.forEach(block => {
      if (!block.trim()) return;
      
      const lines = block.split('\n');
      const timeLine = lines[0];
      const textLines = lines.slice(1);
      const text = textLines.join('').replace(/\n/g, ' ');
      
      const [startTimeStr, endTimeStr] = timeLine.split(' --> ');
      
      // 解析时间格式
      const parseTime = (time) => {
        const [hours = '00', minutes = '00', secondsPart = '00'] = time.split(':');
        const [seconds = '00', ms] = secondsPart.split(',');
        return (hours * 3600) + (minutes * 60) + (seconds + '.' + ms);
      };
      
      const startTime = parseTime(startTimeStr);
      const endTime = parseTime(endTimeStr);
      
      result.push({
        startTime,
        endTime,
        text,
        duration: endTime - startTime
      });
    });
    
    return result;
  },
  
  displayLyrics() {
    let self = this;
    if (!self.lyricsData || !self.sound) return;
    
    // 确保歌词显示开关
    const showLyrics = document.getElementById('showLyrics').checked;
    if (!showLyrics) return;
    
    // 清空当前歌词
    const lyricContainer = document.createElement('div');
    lyricContainer.id = 'lyricContainer';
    document.getElementById('lyricPanel').appendChild(lyricContainer);
    
    // 定义当前显示的歌词行
    let currentLine = 0;
    
    // 设置歌词显示间隔
    if (self.lyricInterval) clearInterval(self.lyricInterval);
    self.lyricInterval = setInterval(() => {
      self.updateLyrics();
    }, 100);
    
    // 初始更新歌词
    self.updateLyrics();
  },
  
  updateLyrics() {
    let self = this;
    if (!self.lyricsData || !self.sound) return;
    
    // 获取当前播放位置
    const currentTime = self.sound.seek() || 0;
    
    // 查找当前歌词行
    let currentLine = 0;
    for (let i = 0; i < self.lyricsData.length; i++) {
      if (currentTime >= self.lyricsData[i].startTime && 
          currentTime < self.lyricsData[i].endTime) {
        currentLine = i;
        break;
      }
    }
    
    // 如果没有歌词数据或超出范围，显示提示信息
    if (!self.lyricsData || currentLine >= self.lyricsData.length) {
      document.getElementById('lyricContainer').innerHTML = "歌词已结束";
      return;
    }
    
    // 显示当前歌词行（处理HTML特殊字符）
    let text = self.lyricsData[currentLine].text.replace(/\n/g, '<br>');
    
    // 简单样式
    let style = "font-size: 20px; color: white; text-shadow: 1px 1px 1px rgba(0,0,0,0.5);";
    document.getElementById('lyricContainer').innerHTML = `<span style="${style}">${text}</span>`;
  },
  
  skip: function(direction) {
    let self = this;

    // Get the next track based on the direction of the track.
    let index = 0;
    if (direction === 'next') {
      index = self.index - 1;
      if (index < 0) {
        index = self.playlist.length - 1;
      }
    } else {
      index = self.index + 1;
      if (index >= self.playlist.length) {
        index = 0;
      }
    }

    self.skipTo(index);
  },

  /**
   * Skip to the next or previous track.
   * @param  {String} direction 'next' or 'prev'.
   */
  skip: function(direction) {
  },
  
  /**
   * Skip to a specific track based on its playlist index.
   * @param  {Number} index Index in the playlist.
   */
  skipTo: function(index) {
    let self = this;

    // Stop the current track.
    if (self.playlist[self.index].howl) {
      self.playlist[self.index].howl.stop();
    }

    // Reset progress.
    progress.style.width = '0%';

    // Play the new track.
    self.play(index);
  },

  /**
   * Set the volume and update the volume slider display.
   * @param  {Number} val Volume between 0 and 1.
   */
  volume: function(val) {
    let self = this;

    // Update the global volume (affecting all Howls).
    Howler.volume(val);

    // Update the display on the slider.
    let barWidth = (val * 90) / 100;
    barFull.style.width = (barWidth * 100) + '%';
    sliderBtn.style.left = (window.innerWidth * barWidth + window.innerWidth * 0.05 - 25) + 'px';
  },

  /**
   * Seek to a new position in the currently playing track.
   * @param  {Number} per Percentage through the song to skip.
   */
  seek: function(per) {
    let self = this;

    // Get the Howl we want to manipulate.
    let sound = self.playlist[self.index].howl;

    // Convert the percent into a seek position.
    if (sound.playing()) {
      sound.seek(sound.duration() * per);
    }
  },

  /**
   * The step called within requestAnimationFrame to update the playback position.
   */
  step: function() {
    let self = this;

    // Get the Howl we want to manipulate.
    let sound = self.playlist[self.index].howl;

    // Determine our current seek position.
    let seek = sound.seek() || 0;
    timer.innerHTML = self.formatTime(Math.round(seek));
    progress.style.width = (((seek / sound.duration()) * 100) || 0) + '%';

    // If the sound is still playing, continue stepping.
    if (sound.playing()) {
      requestAnimationFrame(self.step.bind(self));
    }
  },

  //是否显示歌曲列表
  togglePlaylist: function() {
    let self = this;
    let display = (playlist.style.display === 'block') ? 'none' : 'block';

    setTimeout(function() {
      playlist.style.display = display;
      if (playlist.style.display=='block'){ //滚动到当前播放歌曲的位置
        let [parentDoc,childDoc]= [list,document.querySelector('#list-song-'+playNum)];
        parentDoc.scrollTop = childDoc.offsetTop - parentDoc.offsetHeight /2 ;
      }

    }, (display === 'block') ? 0 : 500);
    playlist.className = (display === 'block') ? 'fadein' : 'fadeout';
  },

  //是否显示文章
  togglePost: function() {
    if(post.style.display=="none"){post.style.display="block";}
    else{post.style.display="none";}
  },

  //显示/隐藏歌词
  toggleLyrics: function() {
    let showLyrics = document.getElementById('showLyrics').checked;
    showLyrics = !showLyrics;
    document.getElementById('showLyrics').checked = showLyrics;
    
    // 如果播放了歌曲，刷新歌词显示
    if(this.sound) {
      showLyrics ? this.displayLyrics() : document.getElementById('lyricContainer').style.display = "none";
    }
  },
  
  //是否显示频率
  toggleWave: function() {
    if(waveCanvas.style.display=="none"){waveCanvas.style.display="block";}
    else{waveCanvas.style.display="none";}
  },

  //是否显示音量调节界面
  toggleVolume: function() {
    let self = this;
    let display = (volume.style.display === 'block') ? 'none' : 'block';

    setTimeout(function() {
      volume.style.display = display;
    }, (display === 'block') ? 0 : 500);
    volume.className = (display === 'block') ? 'fadein' : 'fadeout';
  },

  //格式化时间为 M:SS.
  formatTime: function(secs) {
    let minutes = Math.floor(secs / 60) || 0;
    let seconds = (secs - minutes * 60) || 0;
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }
};

// Bind our player controls.
playBtn.addEventListener('click', function() {
  player.play();
});
pauseBtn.addEventListener('click', function() {
  player.pause();
});
prevBtn.addEventListener('click', function() {
  player.skip('prev');
});
nextBtn.addEventListener('click', function() {
  player.skip('next');
});
progressBar.addEventListener('click', function(event) {
  player.seek(event.clientX / window.innerWidth);
});
playlistBtn.addEventListener('click', function() {
  player.togglePlaylist();
});
postBtn.addEventListener('click', function() {
  player.togglePost();
});
waveBtn.addEventListener('click', function() {
  player.toggleWave();
});
volumeBtn.addEventListener('click', function() {
  player.toggleVolume();
});
playlist.addEventListener('click', function() {
  player.togglePlaylist();
});

// 添加歌词显示开关的事件处理
document.getElementById('lyricToggle').addEventListener('change', function() {
  player.toggleLyrics();
});

let canvasCtx=waveCanvas.getContext("2d");

function draw() {
  let HEIGHT = window.innerHeight;
  let WIDTH = window.innerWidth;
  waveCanvas.setAttribute('width', WIDTH);
  waveCanvas.setAttribute('height', HEIGHT);

  canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
  drawVisual = requestAnimationFrame(draw);

  if(player.sound && player.analyser) {
    canvasCtx.fillStyle = "rgba(0,0,0,0)";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    
    player.analyser.getByteFrequencyData(player.dataArray);

    const barWidth = (WIDTH / player.bufferLength);
    let barHeight;
    let x = 0;

    for (let i = 0; i < player.bufferLength; i++) {
      const v = player.dataArray[i] / 2;
      barHeight = v;

      canvasCtx.fillStyle = `rgb(${v}, ${v}, ${v})`;
      canvasCtx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight/2);

      x += barWidth + 1;
    }
  }
}

document.addEventListener('keyup', function(event) {
  console.log(event.key);
  if (event.key == ' ' || event.key == "MediaPlayPause"){
    if(pauseBtn.style.display == 'none' || pauseBtn.style.display=="") {player.play();}
    else {player.pause();}
  }
  else if(event.key == "MediaTrackNext"){player.skip('next');}
  else if(event.key == "MediaTrackPrevious"){player.skip('prev');}
  else if(event.key == "l"|| event.key === "L"){player.togglePlaylist();}
  else if(event.key == "p"|| event.key === "P"){player.togglePost();}
  else if(event.key == "w"|| event.key === "W"){player.toggleWave();}
  else if(event.key == "v"|| event.key === "V"){player.toggleVolume;}
  else if(event.key == "k"|| event.key === "K"){player.toggleLyrics();} // 添加K键切换歌词
});

console.log("\n %c Gmemp v3.4.8 %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
