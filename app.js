(function () {
  'use strict';

  var state = {
    venueId: 'ohc2',   // 默认场地（与原型一致：奥海城二期）
    tabId: null,
    carouselTimer: null,
    carouselIndex: 0,
  };

  var el = {
    selector: document.getElementById('venueSelector'),
    venueBtn: document.getElementById('venueBtn'),
    venueName: document.getElementById('venueName'),
    dropdown: document.getElementById('venueDropdown'),
    tabsBar: document.getElementById('tabsBar'),
    content: document.getElementById('content'),
  };

  function getVenue() {
    return VENUES.find(function (v) { return v.id === state.venueId; }) || VENUES[0];
  }
  function getTab() {
    var v = getVenue();
    return v.tabs.find(function (t) { return t.id === state.tabId; }) || v.tabs[0];
  }

  // —— 场地下拉 ——
  function renderDropdown() {
    el.dropdown.innerHTML = '';
    VENUES.forEach(function (v) {
      var li = document.createElement('li');
      li.textContent = v.name;
      li.setAttribute('role', 'option');
      if (v.id === state.venueId) li.classList.add('selected');
      li.addEventListener('click', function () {
        selectVenue(v.id);
        closeDropdown();
      });
      el.dropdown.appendChild(li);
    });
  }

  function openDropdown() { el.selector.classList.add('open'); }
  function closeDropdown() { el.selector.classList.remove('open'); }

  function selectVenue(id) {
    state.venueId = id;
    var v = getVenue();
    el.venueName.textContent = v.name;
    state.tabId = v.tabs[0] ? v.tabs[0].id : null; // 切换场地后重置到第一个 tab
    renderDropdown();
    renderTabs();
    renderContent();
  }

  // —— Tab 栏 ——
  function renderTabs() {
    var v = getVenue();
    el.tabsBar.innerHTML = '';
    v.tabs.forEach(function (t) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab' + (t.id === state.tabId ? ' active' : '');
      btn.textContent = t.title;
      btn.addEventListener('click', function () {
        if (state.tabId === t.id) return;
        state.tabId = t.id;
        renderTabs();
        renderContent();
        // 激活的 tab 滚动进可视区
        btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      });
      el.tabsBar.appendChild(btn);
    });
  }

  // —— 内容区 ——
  function renderContent() {
    stopCarousel();
    var tab = getTab();
    el.content.innerHTML = '';

    if (!tab) {
      var tip = document.createElement('div');
      tip.className = 'empty-tip';
      tip.textContent = '暂无内容';
      el.content.appendChild(tip);
      return;
    }

    var hasPoster = Array.isArray(tab.posters) && tab.posters.length > 0;

    // markdown 区
    var md = document.createElement('div');
    md.className = 'md-area';
    var body = document.createElement('div');
    body.className = 'md-body';
    body.innerHTML = MarkdownLite.render(tab.markdown || '');
    md.appendChild(body);
    el.content.appendChild(md);

    // 海报区（仅当有海报时，与 markdown 平分）
    if (hasPoster) {
      var area = buildCarousel(tab.posters);
      el.content.appendChild(area);
      // markdown 区高度与海报保持一致，超出部分内部垂直滚动
      var carousel = area.querySelector('.poster-carousel');
      md.style.height = carousel.clientHeight + 'px';
    }
  }

  // —— 9:16 海报轮播（首尾克隆，无感循环）——
  function buildCarousel(posters) {
    var area = document.createElement('div');
    area.className = 'poster-area';

    var carousel = document.createElement('div');
    carousel.className = 'poster-carousel';

    var track = document.createElement('div');
    track.className = 'poster-track';

    var n = posters.length;
    var multi = n > 1;

    // 多张时：在首尾各克隆一张，形成 [末, 0..n-1, 首]，实现两个方向的无感循环
    var seq = multi ? [posters[n - 1]].concat(posters, [posters[0]]) : posters.slice();
    seq.forEach(function (src) {
      var slide = document.createElement('div');
      slide.className = 'poster-slide';
      var img = document.createElement('img');
      img.src = src;
      img.alt = '海报';
      img.draggable = false;
      slide.appendChild(img);
      track.appendChild(slide);
    });
    carousel.appendChild(track);

    // pos 指向 track 中的下标；多张时真实第一张位于下标 1
    var pos = multi ? 1 : 0;

    // 右上角计数标签
    var counter = document.createElement('div');
    counter.className = 'poster-counter';
    carousel.appendChild(counter);

    function realIndex() { return multi ? ((pos - 1) % n + n) % n : 0; }
    function updateCounter() { counter.textContent = (realIndex() + 1) + '/' + n; }

    function setPos(p, animate, px) {
      pos = p;
      track.style.transition = animate ? 'transform .4s ease' : 'none';
      track.style.transform = 'translateX(' + (px != null ? px + 'px' : (-pos * 100) + '%') + ')';
      updateCounter();
    }
    // 翻页前先把“停在克隆张/越界”的情况无动画归位，避免快速连点滑出空白
    function normalize() {
      if (!multi) return;
      if (pos >= n + 1) setPos(1, false);
      else if (pos <= 0) setPos(n, false);
    }
    function next() { normalize(); setPos(pos + 1, true); }
    function prev() { normalize(); setPos(pos - 1, true); }

    // 到达克隆张后，动画结束的瞬间无动画跳回对应真实张
    track.addEventListener('transitionend', function () {
      if (!multi) return;
      if (pos === n + 1) setPos(1, false);       // 越过末尾 -> 回到真实首张
      else if (pos === 0) setPos(n, false);      // 越过开头 -> 回到真实末张
    });

    setPos(pos, false);

    if (multi) {
      carousel.appendChild(makeArrow('prev', prev));
      carousel.appendChild(makeArrow('next', next));
      enableSwipe(carousel, track, function () { return carousel.clientWidth; },
        function () { return pos; }, setPos, next, prev, normalize, n);

      startCarousel();
      carousel.addEventListener('mouseenter', stopCarousel);
      carousel.addEventListener('mouseleave', startCarousel);
    }

    carousel._next = multi ? next : function () {};
    area.appendChild(carousel);
    return area;
  }

  // —— 横向滑动（触屏 + 鼠标拖拽），跟手 + 阈值翻页 ——
  function enableSwipe(carousel, track, getWidth, getPos, setPos, next, prev, normalize, count) {
    var startX = 0, startY = 0, dragging = false, locked = false, width = 0;

    function down(x, y) {
      normalize();        // 先从克隆张归位，避免拖拽时滑出克隆范围露出黑色背景
      dragging = true; locked = false;
      startX = x; startY = y;
      width = getWidth();
      stopCarousel();
    }
    function move(x, y) {
      if (!dragging) return false;
      var dx = x - startX, dy = y - startY;
      if (!locked) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return false;
        locked = true;
      }
      // 跟手（像素偏移），并夹紧在 [首克隆, 末克隆] 之间，避免露出黑底
      var offset = -getPos() * width + dx;
      offset = Math.max(-(count + 1) * width, Math.min(0, offset));
      setPos(getPos(), false, offset);
      return true;
    }
    function up(x) {
      if (!dragging) return;
      dragging = false;
      var dx = x - startX;
      var threshold = Math.max(40, width * 0.18);
      if (dx <= -threshold) next();
      else if (dx >= threshold) prev();
      else setPos(getPos(), true); // 回弹
      startCarousel();
    }

    // 触屏
    carousel.addEventListener('touchstart', function (e) {
      down(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    carousel.addEventListener('touchmove', function (e) {
      if (move(e.touches[0].clientX, e.touches[0].clientY)) e.preventDefault();
    }, { passive: false });
    carousel.addEventListener('touchend', function (e) {
      up((e.changedTouches[0] || {}).clientX || startX);
    });

    // 鼠标拖拽
    carousel.addEventListener('mousedown', function (e) {
      if (e.target.closest('.poster-arrow')) return;
      e.preventDefault();
      down(e.clientX, e.clientY);
      function mm(ev) { move(ev.clientX, ev.clientY); }
      function mu(ev) {
        document.removeEventListener('mousemove', mm);
        document.removeEventListener('mouseup', mu);
        up(ev.clientX);
      }
      document.addEventListener('mousemove', mm);
      document.addEventListener('mouseup', mu);
    });
  }

  // —— Tab 栏鼠标拖拽横向滚动（触屏天然支持）——
  function enableTabDrag(bar) {
    var down = false, moved = false, startX = 0, startScroll = 0;
    bar.addEventListener('mousedown', function (e) {
      down = true; moved = false;
      startX = e.clientX; startScroll = bar.scrollLeft;
    });
    bar.addEventListener('mousemove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) { moved = true; bar.classList.add('dragging'); }
      bar.scrollLeft = startScroll - dx;
    });
    function end() { down = false; bar.classList.remove('dragging'); }
    bar.addEventListener('mouseup', end);
    bar.addEventListener('mouseleave', end);
    // 拖拽后抑制误触发 tab 点击
    bar.addEventListener('click', function (e) {
      if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; }
    }, true);
  }

  function makeArrow(dir, onClick) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'poster-arrow ' + dir;
    btn.innerHTML = dir === 'prev'
      ? '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    btn.addEventListener('click', onClick);
    return btn;
  }

  function startCarousel() {
    stopCarousel();
    state.carouselTimer = setInterval(function () {
      var carousel = el.content.querySelector('.poster-carousel');
      if (carousel && carousel._next) carousel._next();
    }, 4000);
  }
  function stopCarousel() {
    if (state.carouselTimer) { clearInterval(state.carouselTimer); state.carouselTimer = null; }
  }

  // —— 事件绑定 ——
  el.venueBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    el.selector.classList.toggle('open');
  });
  document.addEventListener('click', function (e) {
    if (!el.selector.contains(e.target)) closeDropdown();
  });

  // —— 初始化 ——
  function init() {
    var v = getVenue();
    el.venueName.textContent = v.name;
    state.tabId = v.tabs[0] ? v.tabs[0].id : null;
    renderDropdown();
    renderTabs();
    renderContent();
    enableTabDrag(el.tabsBar);
  }

  init();
})();
