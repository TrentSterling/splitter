(function (root) {
    'use strict';
    if (!root || !root.document || root.TrontAboutDiscovery) return;

    var doc = root.document;
    var LEGACY_STORAGE_KEY = 'tront-about-discovery-session-v1';
    var STORAGE_KEY = 'tront-about-discovery-session-v2';
    var FIXED_IDS = ['craftmine', 'smear'];
    var RANDOM_IDS = ['inkride', 'tinytreads', 'tinyrise'];
    var RANDOM_COUNT = 2;
    var MAX_PREVIEWS = 3;
    var GAMES = [
        {
            id: 'craftmine', title: 'CraftMine', year: '2025',
            href: '/craftmine/', poster: '/games/media/craftmine-2025.webp?v=6548c556b7e9',
            preview: '/games/media/craftmine-2025.mp4?v=741b400e1a9b',
            description: 'Build, dig, and blow holes in a voxel world, solo or with friends.'
        },
        {
            id: 'smear', title: 'SMEAR', year: '2026',
            href: '/smear/', poster: '/games/media/smear-2026.webp?v=475c3f008f06',
            preview: null,
            description: 'Grab dummies, break things and drag the mess around.'
        },
        {
            id: 'inkride', title: 'INKRIDE', year: '2026',
            href: '/inkride/', poster: '/games/media/inkride-2026.webp?v=c70ac4423864',
            preview: '/games/media/inkride-2026.mp4?v=1590f82ebd34',
            description: 'Draw tracks in ink, ride them and crash beautifully in a shared physics sketchbook.'
        },
        {
            id: 'tinytreads', title: 'Tiny Treads', year: '2026',
            href: '/tinytreads/', poster: '/games/media/tiny-treads-2026.webp?v=695d0c68976e',
            preview: '/games/media/tiny-treads-2026.mp4?v=754ee2ee465a',
            description: 'Trade artillery shots across destructible terrain in turn-based battles.'
        },
        {
            id: 'tinyrise', title: 'Tinyrise', year: '2026',
            href: '/tinyrise/', poster: '/games/media/tinyrise-2026.webp?v=b27e4bc4479e',
            preview: '/games/media/tinyrise-2026.mp4?v=7c59e1b5395f',
            description: 'Build a city, then zoom in to follow one tiny life using its streets and stairs.'
        }
    ];
    var ALIASES = {
        craftmine: 'craftmine', 'craft-mine': 'craftmine',
        smear: 'smear',
        inkride: 'inkride', 'ink-ride': 'inkride',
        tinytreads: 'tinytreads', 'tiny-treads': 'tinytreads', 'tiny-tread': 'tinytreads',
        tinyrise: 'tinyrise', 'tiny-rise': 'tinyrise'
    };
    var memoryChoices = null;
    var initialized = false;
    var visibilityObserver = null;
    var surfaceObserver = null;
    var allCards = [];
    var allHosts = [];
    var gameSurfaces = [];
    var activePreviews = [];
    var lightweightGameSurfaceVisible = false;

    function findGame(id) {
        for (var i = 0; i < GAMES.length; i += 1) if (GAMES[i].id === id) return GAMES[i];
        return null;
    }

    function canonicalGameId(value) {
        if (value == null) return null;
        var text = String(value).trim().toLowerCase();
        if (!text) return null;
        try {
            if (/^(https?:)?\/\//i.test(text)) text = new root.URL(text, root.location && root.location.href).pathname;
        } catch (_) { /* Route strings still work if URL construction is unavailable. */ }
        text = text.replace(/[?#].*$/, '').replace(/\/+$/, '').replace(/\/index(?:\.html?)?$/, '');
        var parts = text.split('/').filter(Boolean);
        for (var i = parts.length - 1; i >= 0; i -= 1) {
            var token = parts[i].replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-');
            if (ALIASES[token]) return ALIASES[token];
        }
        return null;
    }

    function currentGameFor(host) {
        var explicit = host && host.getAttribute && host.getAttribute('data-current-game');
        if (!explicit && doc.documentElement && doc.documentElement.getAttribute) {
            explicit = doc.documentElement.getAttribute('data-current-game') || doc.documentElement.getAttribute('data-tront-game');
        }
        var current = canonicalGameId(explicit);
        if (current) return current;
        var canonical = doc.querySelector && doc.querySelector('link[rel="canonical"]');
        return canonicalGameId(canonical && (canonical.href || canonical.getAttribute('href')) || (root.location && root.location.pathname));
    }

    function getStorage(options) {
        if (options && Object.prototype.hasOwnProperty.call(options, 'storage')) return options.storage;
        try { return root.sessionStorage; } catch (_) { return null; }
    }

    function safeRead(storage, key) {
        try { return storage && storage.getItem(key); } catch (_) { return null; }
    }

    function safeWrite(storage, key, value) {
        try { if (storage) storage.setItem(key, value); } catch (_) { /* The in-memory choice remains stable for this page. */ }
    }

    function isRandomId(id) {
        return RANDOM_IDS.indexOf(id) !== -1;
    }

    function validChoicePair(value) {
        if (!Array.isArray(value) || value.length !== RANDOM_COUNT) return false;
        return isRandomId(value[0]) && isRandomId(value[1]) && value[0] !== value[1];
    }

    function stableSessionChoices(storage, random) {
        var saved = safeRead(storage, STORAGE_KEY);
        if (saved) {
            try {
                var parsed = JSON.parse(saved);
                if (validChoicePair(parsed)) {
                    memoryChoices = parsed.slice();
                    return memoryChoices.slice();
                }
            } catch (_) { /* A stale or malformed session value is replaced below. */ }
        }
        if (validChoicePair(memoryChoices)) {
            safeWrite(storage, STORAGE_KEY, JSON.stringify(memoryChoices));
            return memoryChoices.slice();
        }

        var legacyChoice = safeRead(storage, LEGACY_STORAGE_KEY);
        var firstIndex = isRandomId(legacyChoice) ? RANDOM_IDS.indexOf(legacyChoice) : -1;
        if (firstIndex === -1) {
            var roll = Number(random());
            if (!isFinite(roll)) roll = 0;
            roll = Math.max(0, Math.min(0.999999999, roll));
            firstIndex = Math.floor(roll * RANDOM_IDS.length);
        }
        memoryChoices = [
            RANDOM_IDS[firstIndex],
            RANDOM_IDS[(firstIndex + 1) % RANDOM_IDS.length]
        ];
        safeWrite(storage, STORAGE_KEY, JSON.stringify(memoryChoices));
        if (!legacyChoice) safeWrite(storage, LEGACY_STORAGE_KEY, memoryChoices[0]);
        return memoryChoices.slice();
    }

    function selectAdditionalGames(currentGame, options) {
        options = options || {};
        var current = canonicalGameId(currentGame);
        var storage = getStorage(options);
        var random = typeof options.random === 'function' ? options.random : function () { return root.Math.random(); };
        var choices = stableSessionChoices(storage, random);
        var selected = choices.filter(function (id) { return id !== current; });
        var firstIndex = RANDOM_IDS.indexOf(choices[0]);
        for (var offset = 0; selected.length < RANDOM_COUNT && offset < RANDOM_IDS.length; offset += 1) {
            var candidate = RANDOM_IDS[(firstIndex + offset) % RANDOM_IDS.length];
            if (candidate !== current && selected.indexOf(candidate) === -1) selected.push(candidate);
        }
        return selected.slice(0, RANDOM_COUNT);
    }

    function selectAdditionalGame(currentGame, options) {
        return selectAdditionalGames(currentGame, options)[0] || null;
    }

    function selectGameIds(currentGame, options) {
        var current = canonicalGameId(currentGame);
        var ids = FIXED_IDS.filter(function (id) { return id !== current; });
        var additional = selectAdditionalGames(current, options);
        for (var i = 0; i < additional.length; i += 1) {
            if (ids.indexOf(additional[i]) === -1) ids.push(additional[i]);
        }
        return ids;
    }

    function previewAllowed() {
        try {
            if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
        } catch (_) { /* Continue when matchMedia is unavailable. */ }
        try {
            return !(root.navigator && root.navigator.connection && root.navigator.connection.saveData);
        } catch (_) { return true; }
    }

    function cardIsVisible(card) {
        if (!card || doc.hidden) return false;
        var rect = card.getBoundingClientRect();
        var width = root.innerWidth || doc.documentElement.clientWidth || 0;
        var height = root.innerHeight || doc.documentElement.clientHeight || 0;
        return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < height && rect.right > 0 && rect.left < width;
    }

    function hostIsLightweight(host) {
        return lightweightGameSurfaceVisible || !!(host && host.getAttribute && host.getAttribute('data-tront-discovery-mode') === 'lightweight');
    }

    function releasePreview(card) {
        var state = card && card._trontDiscoveryState;
        var video = state && state.video;
        if (!video) return;
        state.generation += 1;
        state.video = null;
        video.onplaying = null;
        video.onerror = null;
        try { video.pause(); } catch (_) { /* The poster remains visible. */ }
        video.hidden = true;
        video.removeAttribute('src');
        try { video.load(); } catch (_) { /* The source is already detached. */ }
        if (video.parentNode) video.parentNode.removeChild(video);
        activePreviews = activePreviews.filter(function (active) { return active !== card; });
    }

    function releaseHost(host) {
        allCards.forEach(function (card) {
            if (card._trontDiscoveryHost === host) releasePreview(card);
        });
    }

    function releaseAll() {
        activePreviews.slice().forEach(releasePreview);
    }

    function failPreview(card, generation) {
        var state = card && card._trontDiscoveryState;
        if (!state || generation !== state.generation) return;
        releasePreview(card);
    }

    function activate(card) {
        if (!card || !previewAllowed() || doc.hidden || !cardIsVisible(card)) return false;
        if (hostIsLightweight(card._trontDiscoveryHost)) return false;
        var state = card._trontDiscoveryState;
        var game = card._trontDiscoveryGame;
        if (!state || !game || !game.preview) return false;
        if (state.video && state.video.getAttribute('src') === game.preview) return true;
        if (activePreviews.length >= MAX_PREVIEWS) return false;

        var media = card.querySelector('.tront-discovery__media');
        if (!media) return false;
        var video = doc.createElement('video');
        video.setAttribute('data-tront-discovery-video', '');
        video.setAttribute('aria-hidden', 'true');
        video.setAttribute('playsinline', '');
        video.setAttribute('tabindex', '-1');
        video.setAttribute('autoplay', '');
        video.preload = 'none';
        video.muted = true;
        video.defaultMuted = true;
        video.loop = true;
        video.playsInline = true;
        video.hidden = true;
        state.generation += 1;
        var generation = state.generation;
        state.video = video;
        activePreviews.push(card);
        video.onplaying = function () {
            if (state.generation !== generation || state.video !== video) return;
            video.hidden = false;
        };
        video.onerror = function () { failPreview(card, generation); };
        media.appendChild(video);
        video.setAttribute('src', game.preview);
        video.load();
        try {
            var playback = video.play();
            if (playback && typeof playback.catch === 'function') playback.catch(function () { failPreview(card, generation); });
        } catch (_) { failPreview(card, generation); }
        return true;
    }

    function syncCard(card) {
        var state = card && card._trontDiscoveryState;
        if (!state) return;
        state.visible = cardIsVisible(card);
        if (state.visible && previewAllowed() && !hostIsLightweight(card._trontDiscoveryHost)) activate(card);
        else releasePreview(card);
    }

    function syncAllCards() {
        allCards.forEach(syncCard);
    }

    function createText(tag, className, text) {
        var element = doc.createElement(tag);
        if (className) element.className = className;
        if (text != null) element.textContent = text;
        return element;
    }

    function createCard(host, game) {
        var article = createText('article', 'tront-discovery__card');
        article.setAttribute('data-tront-discovery-game', game.id);
        article._trontDiscoveryGame = game;
        article._trontDiscoveryHost = host;
        article._trontDiscoveryState = {visible: false, generation: 0, video: null};

        var media = createText('div', 'tront-discovery__media');
        var imageLink = doc.createElement('a');
        imageLink.className = 'tront-discovery__image-link';
        imageLink.href = game.href;
        imageLink.setAttribute('aria-label', 'Open ' + game.title + ' (' + game.year + ')');
        var image = doc.createElement('img');
        image.className = 'tront-discovery__poster';
        image.src = game.poster;
        image.alt = game.title + ' (' + game.year + ') gameplay poster';
        image.loading = 'lazy';
        image.decoding = 'async';
        image.width = 640;
        image.height = 360;
        imageLink.appendChild(image);
        media.appendChild(imageLink);

        var content = createText('div', 'tront-discovery__content');
        var heading = doc.createElement('h3');
        heading.className = 'tront-discovery__title';
        var titleLink = doc.createElement('a');
        titleLink.href = game.href;
        titleLink.textContent = game.title;
        heading.appendChild(titleLink);
        content.appendChild(heading);
        content.appendChild(createText('p', 'tront-discovery__description', game.description));
        article.appendChild(media);
        article.appendChild(content);
        return article;
    }

    function hostDisclosureChain(host) {
        var chain = [];
        for (var parent = host && host.parentElement; parent; parent = parent.parentElement) {
            if (parent.tagName && String(parent.tagName).toLowerCase() === 'details') chain.push(parent);
        }
        return chain;
    }

    function disclosuresAreOpen(chain) {
        for (var i = 0; i < chain.length; i += 1) if (!chain[i].open) return false;
        return true;
    }

    function watchDisclosures(host, chain) {
        var watched = host._trontDiscoveryWatchedDetails || (host._trontDiscoveryWatchedDetails = []);
        for (var i = 0; i < chain.length; i += 1) {
            var disclosure = chain[i];
            if (watched.indexOf(disclosure) !== -1) continue;
            watched.push(disclosure);
            disclosure.addEventListener('toggle', function () {
                var currentChain = hostDisclosureChain(host);
                if (!disclosuresAreOpen(currentChain)) {
                    releaseHost(host);
                    return;
                }
                setupHost(host);
                syncAllCards();
            });
        }
    }

    function setupHost(host) {
        if (!host) return;
        var grid = host.querySelector('[data-tront-discovery-cards]');
        if (!grid) return;
        var chain = hostDisclosureChain(host);
        watchDisclosures(host, chain);
        if (!disclosuresAreOpen(chain) || host._trontDiscoveryReady) return;
        host._trontDiscoveryReady = true;
        allHosts.push(host);
        var selected = selectGameIds(currentGameFor(host), {storage: getStorage()});
        while (grid.firstChild) grid.removeChild(grid.firstChild);
        for (var i = 0; i < selected.length; i += 1) {
            var game = findGame(selected[i]);
            if (!game) continue;
            var card = createCard(host, game);
            grid.appendChild(card);
            allCards.push(card);
            if (visibilityObserver) visibilityObserver.observe(card);
        }
        updateLightweightMode();
    }

    function updateLightweightMode() {
        lightweightGameSurfaceVisible = gameSurfaces.some(function (surface) {
            return surface._trontDiscoveryObserved ? !!surface._trontDiscoveryVisible : cardIsVisible(surface);
        });
        allHosts.forEach(function (host) {
            var lightweight = hostIsLightweight(host);
            if (host._trontDiscoveryLightweight === lightweight) return;
            host._trontDiscoveryLightweight = lightweight;
            if (host.classList) host.classList.toggle('tront-discovery--lightweight', lightweight);
            if (lightweight) releaseHost(host);
            else syncAllCards();
        });
    }

    function observeGameSurfaces() {
        gameSurfaces = Array.prototype.slice.call(doc.querySelectorAll('[data-tront-discovery-game-surface]'));
        if (!surfaceObserver) return;
        gameSurfaces.forEach(function (surface) { surfaceObserver.observe(surface); });
    }

    function updateRootsForMotion() {
        if (!previewAllowed()) releaseAll();
        else syncAllCards();
    }

    function start() {
        if (initialized) return;
        initialized = true;
        if (typeof root.IntersectionObserver === 'function') {
            visibilityObserver = new root.IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    var card = entry.target;
                    var state = card._trontDiscoveryState;
                    if (!state) return;
                    state.visible = !!entry.isIntersecting && entry.intersectionRatio > 0;
                    if (state.visible) syncCard(card);
                    else releasePreview(card);
                });
            }, {root: null, threshold: 0.01});
            surfaceObserver = new root.IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    entry.target._trontDiscoveryObserved = true;
                    entry.target._trontDiscoveryVisible = !!entry.isIntersecting && entry.intersectionRatio > 0;
                });
                updateLightweightMode();
            }, {root: null, threshold: 0.01});
        }
        observeGameSurfaces();
        var hosts = doc.querySelectorAll('[data-tront-discovery]');
        for (var i = 0; i < hosts.length; i += 1) setupHost(hosts[i]);
        if (!visibilityObserver) {
            var onViewportChange = function () {
                gameSurfaces.forEach(function (surface) {
                    surface._trontDiscoveryObserved = true;
                    surface._trontDiscoveryVisible = cardIsVisible(surface);
                });
                updateLightweightMode();
                syncAllCards();
            };
            if (root.addEventListener) {
                root.addEventListener('scroll', onViewportChange, {passive: true});
                root.addEventListener('resize', onViewportChange, {passive: true});
            }
            onViewportChange();
        }
        doc.addEventListener('visibilitychange', function () {
            if (doc.hidden) releaseAll();
            else syncAllCards();
        });
        try {
            var motion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)');
            if (motion && motion.addEventListener) motion.addEventListener('change', updateRootsForMotion);
            else if (motion && motion.addListener) motion.addListener(updateRootsForMotion);
            var connection = root.navigator && root.navigator.connection;
            if (connection && connection.addEventListener) connection.addEventListener('change', updateRootsForMotion);
        } catch (_) { /* Preferences are checked again whenever visibility changes. */ }
        updateLightweightMode();
        updateRootsForMotion();
    }

    var api = {
        version: 2,
        canonicalGameId: canonicalGameId,
        currentGameFor: currentGameFor,
        selectAdditionalGame: selectAdditionalGame,
        selectAdditionalGames: selectAdditionalGames,
        selectGameIds: selectGameIds,
        catalog: GAMES.map(function (game) { return Object.assign({}, game); })
    };
    root.TrontAboutDiscovery = api;
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, {once: true});
    else start();
})(window);
