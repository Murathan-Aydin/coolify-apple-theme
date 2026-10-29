// Apple theme for Coolify. Injected at the end of <head> by nginx (apple-theme.conf),
// so it runs after Coolify's inline theme script and before the page renders.
(() => {
    if (window.__appleTheme) {
        return;
    }
    window.__appleTheme = true;

    const root = document.documentElement;
    const WALLPAPER_KEY = 'appleThemeWallpaper';
    const GLASS_KEY = 'appleThemeGlass';
    // The user's own image: a data: URL (resized upload) or an http(s) URL.
    const IMAGE_KEY = 'appleThemeImage';

    // Gradients of wallpapers.css, with two preview colors each, then photos
    // (the nodra ones, loaded from Unsplash) and the user's image.
    const unsplash = (id, width) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;
    const WALLPAPERS = [
        { id: 'horizon', name: 'Horizon', light: '#93c5fd', dark: '#0ea5e9' },
        { id: 'sunset', name: 'Sunset', light: '#fdba9c', dark: '#e05638' },
        { id: 'neon', name: 'Neon', light: '#d8b4fe', dark: '#a855f7' },
        { id: 'aurora', name: 'Aurora', light: '#6ee7b7', dark: '#10b981' },
        { id: 'graphite', name: 'Graphite', light: '#d4d4d8', dark: '#262626' },
        { id: 'none', name: 'None', light: '#f2f2f7', dark: '#0b0b0e' },
        ...[
            ['dolomites', 'Dolomites', 'photo-1506744038136-46273834b3fb'],
            ['pacific', 'Pacific', 'photo-1507525428034-b723cf961d3e'],
            ['forest', 'Forest', 'photo-1426604966848-d7adac402bff'],
        ].map(([id, name, photo]) => ({ id, name, image: unsplash(photo, 2560), thumb: unsplash(photo, 160) })),
        { id: 'custom', name: 'Your image', custom: true },
    ];

    const read = (key) => {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    };
    const write = (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch {
            // Storage unavailable (private mode): the choice lasts for this page.
        }
    };

    const wallpaper = () => {
        const id = read(WALLPAPER_KEY);
        if (id === 'custom' && !read(IMAGE_KEY)) {
            return 'horizon';
        }
        return WALLPAPERS.some((w) => w.id === id) ? id : 'horizon';
    };
    const cssUrl = (url) => `url("${url.replace(/["\\\n]/g, encodeURIComponent)}")`;
    const intensity = () => {
        const value = Number.parseInt(read(GLASS_KEY), 10);
        return Number.isNaN(value) ? 50 : Math.max(0, Math.min(100, value));
    };

    // Intensity (0–100) → material variables, bounds from liquid-glass.md (as in nodra).
    const glassVars = (value) => {
        const t = value / 100;
        return {
            '--glass-fill': (0.2 + t * 0.6).toFixed(3),
            '--glass-blur': `${Math.round(12 + t * 28)}px`,
            '--glass-saturation': `${Math.round(120 + t * 30)}%`,
            '--glass-border': (0.08 + t * 0.12).toFixed(3),
            '--glass-highlight': (0.1 + t * 0.14).toFixed(3),
        };
    };

    // Coolify reads these on every page; the theme needs the floating, flat
    // navigation and a light, dark or system theme (not the custom colors).
    const normalizeCoolifySettings = () => {
        if (!['light', 'dark', 'system'].includes(read('theme'))) {
            write('theme', 'dark');
        }
        write('navStyle', 'floating');
        write('navItems', 'flat');
    };

    const applyTheme = () => {
        root.dataset.navStyle = 'floating';
        root.dataset.navItems = 'flat';
        const current = WALLPAPERS.find((w) => w.id === wallpaper());
        const image = current.custom ? read(IMAGE_KEY) : current.image;
        root.dataset.wallpaper = image ? 'image' : current.id;
        if (image) {
            root.style.setProperty('--wallpaper-image', cssUrl(image));
        } else {
            root.style.removeProperty('--wallpaper-image');
        }
        Object.entries(glassVars(intensity())).forEach(([name, value]) => root.style.setProperty(name, value));
        document.querySelector('meta[name=theme-color]')?.setAttribute('content', root.classList.contains('dark') ? '#0b0b0e' : '#f2f2f7');
    };

    normalizeCoolifySettings();
    if (typeof window.applyStoredTheme === 'function') {
        const coolifyApply = window.applyStoredTheme;
        window.applyStoredTheme = () => {
            normalizeCoolifySettings();
            coolifyApply();
            applyTheme();
        };
        window.applyStoredTheme();
    } else {
        applyTheme();
    }

    // Vite's dev server injects Coolify's CSS at runtime, after this stylesheet.
    // Keep the theme last so it wins ties (production uses plain <link> tags).
    const keepStylesheetLast = () => {
        // data-apple-theme: nginx injection (official Coolify); data-theme-pack: the fork's theme packs.
        const link = document.querySelector('link[data-apple-theme], link[data-theme-pack]');
        if (!link || !document.querySelector('script[src*="/@vite/client"]')) {
            return;
        }
        new MutationObserver(() => {
            if ([...document.head.querySelectorAll('style, link[rel=stylesheet]')].pop() !== link) {
                document.head.appendChild(link);
            }
        }).observe(document.head, { childList: true });
    };

    // Profile › Appearance: hide the options the theme replaces and add the
    // wallpaper and glass settings.
    const sectionTitled = (title) => [...document.querySelectorAll('section.application-settings-section')]
        .find((section) => section.querySelector('h2')?.textContent.trim() === title);

    // Shrinks an uploaded image so it fits in localStorage (about 5 MB per site).
    const resizeImage = async (file) => {
        const bitmap = await createImageBitmap(file);
        for (const [max, quality] of [[2560, 0.82], [1920, 0.75], [1440, 0.7]]) {
            const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(bitmap.width * scale);
            canvas.height = Math.round(bitmap.height * scale);
            canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            const url = canvas.toDataURL('image/jpeg', quality);
            if (url.length < 3_000_000) {
                return url;
            }
        }
        throw new Error('The image is too large.');
    };

    const buildPanel = () => {
        const section = document.createElement('section');
        section.className = 'application-settings-section';
        section.dataset.atPanel = '';
        section.innerHTML = `
            <div class="application-settings-section-header">
                <div>
                    <h2>Wallpaper</h2>
                    <p>Shown behind the translucent sidebar, toolbar and cards.</p>
                </div>
            </div>
            <div class="application-settings-section-body at-panel-body">
                <div class="at-wallpapers" role="group" aria-label="Wallpaper"></div>
                <div class="at-image">
                    <div class="at-image-head">
                        <span class="at-image-title">Your image</span>
                        <span class="at-image-hint">Stored in this browser only.</span>
                    </div>
                    <div class="at-image-row">
                        <button type="button" class="button" data-at-choose>Choose image…</button>
                        <input type="file" accept="image/*" hidden data-at-file>
                        <input type="url" class="input" placeholder="or paste an image URL (https://…)" data-at-url>
                        <button type="button" class="button" data-at-use-url>Use URL</button>
                        <button type="button" class="button button-error" data-at-remove>Remove</button>
                    </div>
                    <p class="at-image-status" role="status" data-at-status></p>
                </div>
                <div class="at-slider">
                    <div class="at-slider-head">
                        <label for="at-glass">Glass</label>
                        <span class="at-slider-value"></span>
                    </div>
                    <input id="at-glass" type="range" min="0" max="100" step="1">
                    <div class="at-slider-scale"><span>Clear</span><span>Frosted</span></div>
                </div>
            </div>`;

        const list = section.querySelector('.at-wallpapers');
        const render = () => {
            const dark = root.classList.contains('dark');
            const customImage = read(IMAGE_KEY);
            list.replaceChildren(...WALLPAPERS.map((item) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'at-swatch';
                button.setAttribute('aria-pressed', String(item.id === wallpaper()));
                button.innerHTML = '<span class="at-swatch-tile"></span><span class="at-swatch-label"></span>';
                const tile = button.firstElementChild;
                if (item.custom) {
                    tile.classList.add('at-swatch-custom');
                    if (customImage) {
                        tile.style.background = `${cssUrl(customImage)} center / cover`;
                    } else {
                        tile.textContent = '+';
                    }
                } else if (item.thumb) {
                    tile.style.background = `${cssUrl(item.thumb)} center / cover`;
                } else {
                    tile.style.background = `radial-gradient(circle at 30% 25%, ${item.light} 0%, transparent 70%), radial-gradient(circle at 75% 80%, ${item.dark} 0%, transparent 65%), ${dark ? '#0b0b0e' : '#f2f2f7'}`;
                }
                button.lastElementChild.textContent = item.name;
                button.addEventListener('click', () => {
                    if (item.custom && !read(IMAGE_KEY)) {
                        fileInput.click();
                        return;
                    }
                    select(item.id);
                });
                return button;
            }));
            removeButton.hidden = !customImage;
        };

        const status = section.querySelector('[data-at-status]');
        const fileInput = section.querySelector('[data-at-file]');
        const urlInput = section.querySelector('[data-at-url]');
        const removeButton = section.querySelector('[data-at-remove]');
        const select = (id) => {
            write(WALLPAPER_KEY, id);
            applyTheme();
            render();
        };
        const useImage = (url) => {
            try {
                localStorage.setItem(IMAGE_KEY, url);
            } catch {
                status.textContent = 'This browser cannot store the image. Try a smaller one or an image URL.';
                return;
            }
            status.textContent = '';
            select('custom');
        };

        section.querySelector('[data-at-choose]').addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async () => {
            const [file] = fileInput.files;
            fileInput.value = '';
            if (!file) {
                return;
            }
            status.textContent = 'Preparing the image…';
            try {
                useImage(await resizeImage(file));
            } catch (error) {
                status.textContent = `Could not use this image: ${error.message}`;
            }
        });
        section.querySelector('[data-at-use-url]').addEventListener('click', () => {
            let url;
            try {
                url = new URL(urlInput.value.trim());
            } catch {
                url = null;
            }
            if (!url || !['http:', 'https:'].includes(url.protocol)) {
                status.textContent = 'Enter an http(s) image URL.';
                return;
            }
            urlInput.value = '';
            useImage(url.href);
        });
        removeButton.addEventListener('click', () => {
            try {
                localStorage.removeItem(IMAGE_KEY);
            } catch {
                // Nothing stored.
            }
            if (read(WALLPAPER_KEY) === 'custom') {
                write(WALLPAPER_KEY, 'horizon');
            }
            applyTheme();
            render();
        });

        const slider = section.querySelector('#at-glass');
        const value = section.querySelector('.at-slider-value');
        slider.value = intensity();
        value.textContent = `${intensity()}%`;
        slider.addEventListener('input', () => {
            write(GLASS_KEY, slider.value);
            value.textContent = `${slider.value}%`;
            applyTheme();
        });

        render();
        // Re-render the previews when the light/dark theme changes.
        new MutationObserver(render).observe(root, { attributes: true, attributeFilter: ['class'] });
        return section;
    };

    const enhanceAppearancePage = () => {
        const colorTheme = sectionTitled('Color theme');
        if (!colorTheme || document.querySelector('[data-at-panel]')) {
            return;
        }
        ['Navigation style', 'Style'].forEach((title) => sectionTitled(title)?.setAttribute('data-at-hidden', ''));
        [...colorTheme.querySelectorAll('[role="button"]')]
            .filter((card) => card.textContent.includes('Custom'))
            .forEach((card) => card.setAttribute('data-at-hidden', ''));
        colorTheme.after(buildPanel());
    };

    const onPage = () => {
        applyTheme();
        enhanceAppearancePage();
    };

    keepStylesheetLast();
    document.addEventListener('DOMContentLoaded', onPage);
    document.addEventListener('livewire:navigated', onPage);
})();
