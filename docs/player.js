// Cache references to DOM elements.
let elms = ['track','artist', 'timer', 'duration','post', 'playBtn', 'pauseBtn', 'prevBtn', 'nextBtn', 'playlistBtn', 'postBtn', 'waveBtn', 'volumeBtn', 'progress', 'progressBar','waveCanvas', 'loading', 'playlist', 'list', 'volume', 'barEmpty', 'barFull', 'sliderBtn', 'lyricsBtn', 'lyricsText', 'lyricsContainer'];
elms.forEach(function(elm) {
  window[elm] = document.getElementById(elm);
});

let player;
let playNum=0;
let requestJson="memp.json"
// let requestJson="https://music.meekdai.com/memp.json"

// 媒体文件基础路径 - 这是修复的关键
let media="https://music.1357924680liu.dpdns.org/media/";

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
  this.lyricsVisible = true; // 默认显示歌词
  this.currentLyrics = []; // 当前歌词数组
  this.currentLyricIndex = -1; // 当前歌词索引

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
  
  // 加载歌词（如果有）
  if (playlist[this.index].lrc) {
    this.loadLyrics(playlist[this.index].lrc);
  } else {
    // 如果没有歌词，隐藏歌词容器
    lyricsContainer.style.display = 'none';
    this.lyricsVisible = false;
  }
};

// 加载歌词文件
Player.prototype.loadLyrics = function(lrcPath) {
  let self = this;
  self.currentLyrics = [];
  self.currentLyricIndex = -1;
  lyricsText.innerHTML = '加载歌词中...';
  
  // 显示歌词容器
  lyricsContainer.style.display = 'block';
  
  // 使用完整的媒体路径加载歌词
  let lyricsRequest = new XMLHttpRequest();
  lyricsRequest.open('GET', media + lrcPath);
  lyricsRequest.onload = function() {
    if (lyricsRequest.status === 200) {
      self.parseSRTLyrics(lyricsRequest.responseText);
    } else {
      lyricsText.innerHTML = '歌词加载失败';
      console.error('歌词加载失败:', lyricsRequest.status, lrcPath);
    }
  };
  
  lyricsRequest.onerror = function() {
    lyricsText.innerHTML = '歌词加载失败';
    console.error('歌词加载失败:', lrcPath);
  };
  
  lyricsRequest.send();
};

// 解析SRT格式歌词
Player.prototype.parseSRTLyrics = function(text) {
  this.currentLyrics = [];
  
  // 分割成单独的歌词条目
  let blocks = text.split(/\r?\n\r?\n/);
  
  blocks.forEach(block => {
    if (!block.trim()) return;
    
    let lines = block.split(/\r?\n/);
    if (lines.length < 3) return;
    
    // 解析时间轴 (00:00:01,600 --> 00:00:02,400)
    let timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!timeMatch) return;
    
    // 计算开始时间（秒）
    let startTime = parseInt(timeMatch[1]) * 3600 + 
                   parseInt(timeMatch[2]) * 60 + 
                   parseInt(timeMatch[3]) + 
                   parseInt(timeMatch[4]) / 1000;
    
    // 合并歌词文本（可能有多行）
    let lyricText = '';
    for (let i = 2; i < lines.length; i++) {
      lyricText += (lyricText ? '<br>' : '') + lines[i];
    }
    
    this.currentLyrics.push({
      start: startTime,
      text: lyricText
    });
  });
  
  // 按时间排序
  this.currentLyrics.sort((a, b) => a.start - b.start);
  
  // 生成歌词HTML
  lyricsText.innerHTML = this.currentLyrics.map(lyric => 
    `<div class="lyric-line" data-time="${lyric.start}">${lyric.text}</div>`
  ).join('');
  
  // 如果没有歌词，显示提示
  if (this.currentLyrics.length === 0) {
    lyricsText.innerHTML = '无可用歌词';
  }
};

// 更新歌词显示
Player.prototype.updateLyrics = function(time) {
  if (!this.currentLyrics.length || !this.lyricsVisible) return;
  
  // 找到当前时间对应的歌词
  let newIndex = -1;
  for (let i = this.currentLyrics.length - 1; i >= 0; i--) {
    if (time >= this.currentLyrics[i].start) {
      newIndex = i;
      break;
    }
  }
  
  // 如果歌词索引没有变化，不需要更新
  if (newIndex === this.currentLyricIndex) return;
  this.currentLyricIndex = newIndex;
  
  // 更新歌词显示
  const lines = lyricsText.querySelectorAll('.lyric-line');
  lines.forEach((line, index) => {
    if (index === newIndex) {
      line.classList.add('current-lyric');
    } else {
      line.classList.remove('current-lyric');
    }
  });
  
  // 自动滚动到当前歌词
  if (newIndex >= 0 && lines.length > 0) {
    const currentLine = lines[newIndex];
    const container = lyricsContainer;
    const lineTop = currentLine.offsetTop;
    const lineHeight = currentLine.offsetHeight;
    const containerHeight = container.offsetHeight;
    
    container.scrollTop = lineTop - containerHeight / 2 + lineHeight / 2;
  }
};

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
    
        // 传递给 MediaSession
        applyMediaSession({src: croppedUrl,sizes: `${targetSize}x${targetSize}`,type: 'image/jpeg'});
      };
    
      img.onerror = (err) => {console.warn("图片加载失败，继续使用无图片：", artworkUrl, err);};

      // 开始加载原图
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

    // 加载歌词（如果有）
    if (data.lrc) {
      this.loadLyrics(data.lrc);
    } else {
      // 如果没有歌词，隐藏歌词容器
      lyricsContainer.style.display = 'none';
      this.lyricsVisible = false;
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

    // Keep track of the index we are currently playing.
    self.index = index;
  },

  //暂停
  pause: function() {
    let self = this;

    // Get the Howl we want to manipulate.
    let sound = self.playlist[self.index].howl;

    // Puase the sound.
    sound.pause();

    // Show the play button.
    playBtn.style.display = 'block';
    pauseBtn.style.display = 'none';
  },

  /**
   * Skip to the next or previous track.
   * @param  {String} direction 'next' or 'prev'.
   */
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

    // 更新歌词
    if (self.lyricsVisible) {
      self.updateLyrics(seek);
    }

    // If the sound is still playing, continue stepping.
    if (sound.playing()) {
      requestAnimationFrame(self.step.bind(self));
    }
  },

  // 切换歌词显示
  toggleLyrics: function() {
    this.lyricsVisible = !this.lyricsVisible;
    lyricsContainer.style.display = this.lyricsVisible ? 'block' : 'none';
    
    // 如果正在播放且需要显示歌词，立即更新一次
    if (this.lyricsVisible && this.playlist[this.index].howl && this.playlist[this.index].howl.playing()) {
      this.updateLyrics(this.playlist[this.index].howl.seek());
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
playlist.addEventListener('click', function() {
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
volume.addEventListener('click', function() {
  player.toggleVolume();
});
// 绑定歌词按钮事件
lyricsBtn.addEventListener('click', function() {
  player.toggleLyrics();
});

// Setup the event listeners to enable dragging of volume slider.
barEmpty.addEventListener('click', function(event) {
  let per = event.layerX / parseFloat(barEmpty.scrollWidth);
  player.volume(per);
});
sliderBtn.addEventListener('mousedown', function() {
  window.sliderDown = true;
});
sliderBtn.addEventListener('touchstart', function() {
  window.sliderDown = true;
});
volume.addEventListener('mouseup', function() {
  window.sliderDown = false;
});
volume.addEventListener('touchend', function() {
  window.sliderDown = false;
});

let move = function(event) {
  if (window.sliderDown) {
    let x = event.clientX || event.touches[0].clientX;
    let startX = window.innerWidth * 0.05;
    let layerX = x - startX;
    let per = Math.min(1, Math.max(0, layerX / parseFloat(barEmpty.scrollWidth)));
    player.volume(per);
  }
};

volume.addEventListener('mousemove', move);
volume.addEventListener('touchmove', move);

let canvasCtx=waveCanvas.getContext("2d");

function draw() {
  let HEIGHT = window.innerHeight;
  let WIDTH = window.innerWidth;
  waveCanvas.setAttribute('width', WIDTH);
  waveCanvas.setAttribute('height', HEIGHT);

  canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
  drawVisual = requestAnimationFrame(draw);

  player.analyser.getByteFrequencyData(player.dataArray);

  canvasCtx.fillStyle = "rgba(0,0,0,0)";
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

  const barWidth = (WIDTH / player.bufferLength);
  let barHeight;
  let x = 0;

  for (let i = 0; i < player.bufferLength; i++) {
    barHeight = player.dataArray[i];

    // canvasCtx.fillStyle = `rgb(${barHeight + 100}, 50, 50)`;
    canvasCtx.fillStyle = 'rgba(255,255,255,0.5)';
    canvasCtx.fillRect(x, HEIGHT - barHeight / 2, barWidth, barHeight/2);

    x += barWidth + 1;
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
  else if(event.key == "v"|| event.key === "V"){player.toggleVolume();}
  else if(event.key == "y"|| event.key === "Y"){player.toggleLyrics();} // 添加歌词快捷键
});

console.log("\n %c Gmemp v3.4.8 %c https://github.com/Meekdai/Gmemp \n", "color: #fff; background-image: linear-gradient(90deg, rgb(47, 172, 178) 0%, rgb(45, 190, 96) 100%); padding:5px 1px;", "background-image: linear-gradient(90deg, rgb(45, 190, 96) 0%, rgb(255, 255, 255) 100%); padding:5px 0;");
