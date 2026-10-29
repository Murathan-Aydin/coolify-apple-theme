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

    // Wallpapers of wallpapers.css, with two preview colors each.
    const WALLPAPERS = [
        { id: 'horizon', name: 'Horizon', light: '#93c5fd', dark: '#0ea5e9' },
        { id: 'sunset', name: 'Sunset', light: '#fdba9c', dark: '#e05638' },
        { id: 'neon', name: 'Neon', light: '#d8b4fe', dark: '#a855f7' },
        { id: 'aurora', name: 'Aurora', light: '#6ee7b7', dark: '#10b981' },
        { id: 'graphite', name: 'Graphite', light: '#d4d4d8', dark: '#262626' },
        { id: 'none', name: 'None', light: '#f2f2f7', dark: '#0b0b0e' },
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

    const wallpaper = () => (WALLPAPERS.some((w) => w.id === read(WALLPAPER_KEY)) ? read(WALLPAPER_KEY) : 'horizon');
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
        root.dataset.wallpaper = wallpaper();
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
        const link = document.querySelector('link[data-apple-theme]');
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
            list.replaceChildren(...WALLPAPERS.map((item) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'at-swatch';
                button.setAttribute('aria-pressed', String(item.id === wallpaper()));
                button.innerHTML = '<span class="at-swatch-tile"></span><span class="at-swatch-label"></span>';
                button.firstElementChild.style.background = `radial-gradient(circle at 30% 25%, ${item.light} 0%, transparent 70%), radial-gradient(circle at 75% 80%, ${item.dark} 0%, transparent 65%), ${dark ? '#0b0b0e' : '#f2f2f7'}`;
                button.lastElementChild.textContent = item.name;
                button.addEventListener('click', () => {
                    write(WALLPAPER_KEY, item.id);
                    applyTheme();
                    render();
                });
                return button;
            }));
        };

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
