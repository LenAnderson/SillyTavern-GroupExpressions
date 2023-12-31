import { chat, chat_metadata, eventSource, event_types, getRequestHeaders, saveChatConditional, saveChatDebounced, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings, getContext, saveMetadataDebounced } from '../../../extensions.js';
import { delay } from '../../../utils.js';

const log = (...msg) => console.log('[GE]', ...msg);
/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed since the last time the debounced function was invoked.
 * @param {Function} func The function to debounce.
 * @param {Number} [timeout=300] The timeout in milliseconds.
 * @returns {Function} The debounced function.
 */
export function debounceAsync(func, timeout = 300) {
    let timer;
    /**@type {Promise}*/
    let debouncePromise;
    /**@type {Function}*/
    let debounceResolver;
    return (...args) => {
        clearTimeout(timer);
        if (!debouncePromise) {
            debouncePromise = new Promise(resolve => {
                debounceResolver = resolve;
            });
        }
        timer = setTimeout(() => {
            debounceResolver(func.apply(this, args));
            debouncePromise = null;
        }, timeout);
        return debouncePromise;
    };
}




/**@type {Object} */
let settings;
/**@type {Object} */
let csettings;
/**@type {String} */
let groupId;
/**@type {String} */
let chatId;
/**@type {HTMLElement} */
let root;
/**@type {HTMLElement[]} */
let imgs = [];
/**@type {String[]} */
let nameList = [];
/**@type {String[]} */
let left = [];
/**@type {String[]} */
let right = [];
/**@type {String} */
let current;
/**@type {Boolean} */
let busy = false;



/**@type {MutationObserver} */
let mo;
const init = ()=>{
    log('init');
    initSettings();
    mo = new MutationObserver(muts=>{
        if (busy) return;
        const lastCharMes = chat.toReversed().find(it=>!it.is_user && !it.is_system && nameList.find(o=>it.name == o));
        const img = imgs.find(it=>it.getAttribute('data-character') == lastCharMes?.name);
        if (img && document.querySelector('#expression-image').src) {
            const src = document.querySelector('#expression-image').src;
            const parts = src.split('/');
            const name = parts[parts.indexOf('characters')+1];
            const img = imgs.find(it=>it.getAttribute('data-character') == name)?.querySelector('.stge--img');
            if (img) {
                img.src = src;
            }
        }
    });
};
eventSource.on(event_types.APP_READY, ()=>init());

const updateSettingsBackground = ()=>{
    if (document.querySelector('.stge--settings .inline-drawer-content').getBoundingClientRect().height > 0 && settings.transparentMenu) {
        document.querySelector('#rm_extensions_block').style.background = 'rgba(0 0 0 / 0.5)';
    } else {
        document.querySelector('#rm_extensions_block').style.background = '';
    }
};
const initSettings = () => {
    log('initSettings');
    settings = Object.assign({
        isEnabled: true,
        numLeft: -1,
        numRight: 2,
        scaleSpeaker: 120,
        offset: 25,
        transition: 400,
        expression: 'joy',
        scaleDropoff: 3,
        transparentMenu: false,
        extensions: ['png'],
        position: 0,
    }, extension_settings.groupExpressions ?? {});
    extension_settings.groupExpressions = settings;

    const html = `
    <div class="stge--settings">
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Group Expressions</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content" style="font-size:small;">
                <div class="flex-container">
                    <label class="checkbox_label">
                        <input type="checkbox" id="stge--isEnabled" ${settings.isEnabled ? 'checked' : ''}>
                        Enable group expressions
                    </label>
                </div>
                <div class="flex-container">
                    <label class="checkbox_label">
                        <input type="checkbox" id="stge--transparentMenu" ${settings.transparentMenu ? 'checked' : ''}>
                        Transparent settings menu
                    </label>
                </div>
                <div class="flex-container">
                    <label>
                        Position of expression images
                        <div class="stge--positionContainer">
                            Left
                            <input type="range" class="text_pole" min="0" max="100" id="stge--positionRange" value="${settings.position}">
                            Right
                            <input type="number" class="text_pole" min="0" max="100" id="stge--position" value="${settings.position}">
                            %
                        </div>
                    </label>
                </div>
                <div class="flex-container">
                    <label>
                        Number of characters on the left <small>(-1 = unlimited)</small>
                        <input type="number" class="text_pole" min="-1" id="stge--numLeft" value="${settings.numLeft}">
                    </label>
                </div>
                <div class="flex-container">
                    <label>
                        Number of characters on the right <small>(-1 = unlimited)</small>
                        <input type="number" class="text_pole" min="-1" id="stge--numRight" value="${settings.numRight}">
                    </label>
                </div>
                <div class="flex-container">
                    <label>
                        Characters to exclude <small>(comma separated list of names, <strong>saved in chat</strong>)</small>
                        <input type="text" class="text_pole" id="stge--exclude" placeholder="Alice, Bob, Carol" value="" disabled>
                    </label>
                </div>
                <div class="flex-container">
                    <label>
                        Scale of current speaker <small>(percentage; 100 = no change; <100 = shrink; >100 = grow)</small>
                        <input type="number" class="text_pole" min="0" id="stge--scaleSpeaker" value="${settings.scaleSpeaker}">
                    </label>
                </div>
                <div class="flex-container">
                    <label>
                        Offset of characters to the side <small>(percentage; 0 = all stacked in center; <100 = overlapping; >100 = no overlap)</small>
                        <input type="number" class="text_pole" min="0" id="stge--offset" value="${settings.offset}">
                    </label>
                </div>
                <div class="flex-container">
                    <label>
                        Scale dropoff <small>(percentage; 0 = no change; >0 = chars to the side get smaller; >0 = chars to the side get larger)</small>
                        <input type="number" class="text_pole" id="stge--scaleDropoff" value="${settings.scaleDropoff}">
                    </label>
                </div>
                <div class="flex-container">
                    <label>
                        Animation duration <small>(milliseconds)</small>
                        <input type="number" class="text_pole" min="0" id="stge--transition" value="${settings.transition}">
                    </label>
                </div>
                <div class="flex-container">
                    <label>
                        File extensions <small>(comma-separated list, e.g. <code>png,gif,webp</code>)</small>
                        <input type="text" class="text_pole" id="stge--extensions" value="${settings.extensions.join(',')}">
                    </label>
                </div>
                <div class="flex-container">
                    <label>
                        Default expression to be used
                        <select class="text_pole" id="stge--expression"></select>
                    </label>
                </div>
            </div>
        </div>
    </div>
`;
    $('#extensions_settings').append(html);
    window.addEventListener('click', ()=>{
        updateSettingsBackground();
    });
    document.querySelector('#stge--isEnabled').addEventListener('click', ()=>{
        settings.isEnabled = document.querySelector('#stge--isEnabled').checked;
        saveSettingsDebounced();
        restart();
    });
    document.querySelector('#stge--transparentMenu').addEventListener('click', ()=>{
        settings.transparentMenu = document.querySelector('#stge--transparentMenu').checked;
        saveSettingsDebounced();
    });
    document.querySelector('#stge--positionRange').addEventListener('input', ()=>{
        settings.position = document.querySelector('#stge--positionRange').value;
        document.querySelector('#stge--position').value = settings.position;
        saveSettingsDebounced();
        root.style.setProperty('--position', settings.position);
    });
    document.querySelector('#stge--position').addEventListener('input', ()=>{
        settings.position = document.querySelector('#stge--position').value;
        document.querySelector('#stge--positionRange').value = settings.position;
        saveSettingsDebounced();
        root.style.setProperty('--position', settings.position);
    });
    document.querySelector('#stge--numLeft').addEventListener('input', ()=>{
        settings.numLeft = Number(document.querySelector('#stge--numLeft').value);
        saveSettingsDebounced();
    });
    document.querySelector('#stge--numRight').addEventListener('input', ()=>{
        settings.numRight = Number(document.querySelector('#stge--numRight').value);
        saveSettingsDebounced();
    });
    document.querySelector('#stge--exclude').addEventListener('input', ()=>{
        csettings.exclude = document.querySelector('#stge--exclude').value.toLowerCase().split(/\s*,\s*/);
        chat_metadata.groupExpressions = csettings;
        saveMetadataDebounced();
    });
    document.querySelector('#stge--scaleSpeaker').addEventListener('input', ()=>{
        settings.scaleSpeaker = Number(document.querySelector('#stge--scaleSpeaker').value);
        saveSettingsDebounced();
        root.style.setProperty('--scale-speaker', String(settings.scaleSpeaker));
    });
    document.querySelector('#stge--offset').addEventListener('input', ()=>{
        settings.offset = Number(document.querySelector('#stge--offset').value);
        saveSettingsDebounced();
        root.style.setProperty('--offset', String(settings.offset));
    });
    document.querySelector('#stge--scaleDropoff').addEventListener('input', ()=>{
        settings.scaleDropoff = Number(document.querySelector('#stge--scaleDropoff').value);
        saveSettingsDebounced();
        root.style.setProperty('--scale-dropoff', String(settings.scaleDropoff));
    });
    document.querySelector('#stge--transition').addEventListener('input', ()=>{
        settings.transition = Number(document.querySelector('#stge--transition').value);
        saveSettingsDebounced();
        root.style.setProperty('--transition', String(settings.transition));
    });
    document.querySelector('#stge--extensions').addEventListener('input', ()=>{
        settings.extensions = document.querySelector('#stge--extensions').value?.split(/,\s*/);
        saveSettingsDebounced();
        restart();
    });
    const sel = document.querySelector('#stge--expression');
    const exp = [
        'admiration',
        'amusement',
        'anger',
        'annoyance',
        'approval',
        'caring',
        'confusion',
        'curiosity',
        'desire',
        'disappointment',
        'disapproval',
        'disgust',
        'embarrassment',
        'excitement',
        'fear',
        'gratitude',
        'grief',
        'joy',
        'love',
        'nervousness',
        'neutral',
        'optimism',
        'pride',
        'realization',
        'relief',
        'remorse',
        'sadness',
        'surprise',
    ];
    exp.forEach(e=>{
        const opt = document.createElement('option'); {
            opt.value = e;
            opt.textContent = e;
            opt.selected = (settings.expression ?? 'joy') == e;
            sel.append(opt);
        }
    });
    sel.addEventListener('change', ()=>{
        settings.expression = sel.value;
        saveSettingsDebounced();
    });
};

const chatChanged = async ()=>{
    log('chatChanged');
    const context = getContext();

    csettings = Object.assign({
        exclude: [],
    }, chat_metadata.groupExpressions ?? {});
    chat_metadata.groupExpressions = csettings;
    log(chat_metadata);
    document.querySelector('#stge--exclude').disabled = context.groupId == null;
    document.querySelector('#stge--exclude').value = csettings.exclude?.join(', ') ?? '';

    if (context.groupId) {
        await restart();
    } else {
        end();
    }
};
eventSource.on(event_types.CHAT_CHANGED, ()=>chatChanged());

const groupUpdated = (...args) => {
    log('GROUP UPDATED', args);
};
eventSource.on(event_types.GROUP_UPDATED, (...args)=>groupUpdated(...args));

const messageRendered = async () => {
    log('messageRendered');
    while (settings.isEnabled && groupId) {
        if (!busy) {
            updateSettingsBackground();
            await updateMembers();
            //await delay(500); continue;
            const lastMes = chat.toReversed().find(it=>!it.is_system);
            const lastCharMes = chat.toReversed().find(it=>!it.is_user && !it.is_system && nameList.find(o=>it.name == o));
            if (lastCharMes) {
                if (lastCharMes.name != current) {
                    if (left.indexOf(lastCharMes.name) > -1) {
                        left.splice(left.indexOf(lastCharMes.name), 1);
                    } else if (right.indexOf(lastCharMes.name) > -1) {
                        right.splice(right.indexOf(lastCharMes.name), 1);
                    }
                    if ((left.length >= settings.numLeft && settings.numLeft != -1) && (right.length >= settings.numRight && settings.numRight != -1)) {
                        const isLeft = Math.random() < 0.5;
                        let exit;
                        if (isLeft) {
                            exit = left.pop();
                        } else {
                            exit = right.pop();
                        }
                        if (exit) {
                            const img = imgs.find(it=>it.getAttribute('data-character') == exit);
                            img.classList.add('stge--exit');
                            await delay(settings.transition + 150);
                            img.remove();
                        }
                    }
                    if (current) {
                        if ((left.length < settings.numLeft || settings.numLeft == -1) && (left.length <= right.length || (right.length >= settings.numRight && settings.numRight != -1))) {
                            left.unshift(current);
                        } else if (right.length < (settings.numRight || settings.numRight == -1)) {
                            right.unshift(current);
                        }
                    }
                }
                current = lastCharMes.name;
            }
            const img = imgs.find(it=>it.getAttribute('data-character') == lastCharMes?.name);
            imgs
                .filter(it=>(it != img || lastMes != lastCharMes) && it.classList.contains('stge--last'))
                .forEach(it=>it.classList.remove('stge--last'))
            ;
            if (lastMes == lastCharMes) {
                img?.classList?.add('stge--last');
            }
            const ci = imgs.find(it=>it.getAttribute('data-character') == current);
            ci?.style.setProperty('--order', '0');
            ci?.style.setProperty('--dir', '1');
            if (!ci.closest('.stge--root')) {
                ci.classList.add('stge--exit');
                root.append(ci);
                await delay(50);
                ci.classList.remove('stge--exit');
            }
            left.forEach(async(name,idx)=>{
                const wrap = imgs.find(it=>it.getAttribute('data-character') == name);
                wrap?.style?.setProperty('--order', String(idx + 1));
                wrap?.style?.setProperty('--dir', '-1');
                if (!wrap.closest('.stge--root')) {
                    wrap.classList.add('stge--exit');
                    root.append(wrap);
                    await delay(50);
                    wrap.classList.remove('stge--exit');
                }
            });
            right.forEach(async(name,idx)=>{
                const wrap = imgs.find(it=>it.getAttribute('data-character') == name);
                wrap?.style?.setProperty('--order', String(idx + 1));
                wrap?.style?.setProperty('--dir', '1');
                if (!wrap.closest('.stge--root')) {
                    wrap.classList.add('stge--exit');
                    root.append(wrap);
                    await delay(50);
                    wrap.classList.remove('stge--exit');
                }
            });
        }
        await delay(Math.max(settings.transition + 100, 500));
    }
};
// eventSource.on(event_types.USER_MESSAGE_RENDERED, ()=>messageRendered());
// eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, ()=>messageRendered());




const findImage = async(name) => {
    for (const ext of settings.extensions) {
        const url = `/characters/${name}/${settings.expression}.${ext}`;
        const resp = await fetch(url, {
            method: 'HEAD',
            headers: getRequestHeaders(),
        });
        if (resp.ok) {
            return url;
        }
    }
};
const updateMembers = async()=>{
    if (busy) return;
    busy = true;
    const context = getContext();
    const group = context.groups.find(it=>it.id == groupId);
    const members = group.members.map(m=>context.characters.find(c=>c.avatar == m)).filter(it=>it);
    const names = getOrder(members.map(it=>it.name)).filter(it=>csettings.exclude?.indexOf(it.toLowerCase()) == -1);
    names.push(...members.filter(m=>!names.find(it=>it == m.name)).map(it=>it.name).filter(it=>csettings.exclude?.indexOf(it.toLowerCase()) == -1));
    const removed = nameList.filter(it=>names.indexOf(it) == -1);
    const added = names.filter(it=>nameList.indexOf(it) == -1);
    for (const name of removed) {
        nameList.splice(nameList.indexOf(name), 1);
        let idx = imgs.findIndex(it=>it.getAttribute('data-character') == name);
        const img = imgs.splice(idx, 1)[0];
        idx = left.indexOf(name);
        if (idx > -1) {
            left.splice(idx, 1);
        } else {
            idx = right.indexOf(name);
            if (idx > -1) {
                right.splice(idx, 1);
            } else {
                current = null;
            }
        }
        img.classList.add('stge--exit');
        await delay(settings.transition + 150);
        img.remove();
    }
    const purgatory = [];
    while (settings.numLeft != -1 && left.length > settings.numLeft) {
        purgatory.push(left.pop());
    }
    while (settings.numRight != -1 && right.length > settings.numRight) {
        purgatory.push(right.pop());
    }
    for (const name of added) {
        nameList.push(name);
        if (!current) {
            current = name;
        } else if ((left.length < settings.numLeft || settings.numLeft == -1) && (left.length <= right.length || right.length >= settings.numRight)) {
            left.push(name);
        } else if (right.length < settings.numRight || settings.numRight == -1) {
            right.push(name);
        }
        const wrap = document.createElement('div'); {
            imgs.push(wrap);
            wrap.classList.add('stge--wrapper');
            wrap.setAttribute('data-character', name);
            const img = document.createElement('img'); {
                img.classList.add('stge--img');
                img.src = await findImage(name);
                wrap.append(img);
            }
        }
    }
    for (const name of purgatory) {
        if (!current) {
            current = name;
        } else if ((left.length < settings.numLeft || settings.numLeft == -1) && (left.length <= right.length || right.length >= settings.numRight)) {
            left.push(name);
        } else if (right.length < settings.numRight || settings.numRight == -1) {
            right.push(name);
        } else {
            const wrap = imgs.find(it=>it.getAttribute('data-character') == name);
            if (wrap) {
                wrap.classList.add('stge--exit');
                await delay(settings.transition + 150);
                wrap.remove();
            }
        }
    }
    const queue = nameList.filter(it=>left.indexOf(it)==-1 && right.indexOf(it) == -1 && it != current);
    while (queue.length > 0 && (settings.numLeft == -1 || settings.numRight == -1 || left.length < settings.numLeft || right.length < settings.numRight || !current)) {
        const name = queue.pop();
        if (!current) {
            current = name;
        } else if ((left.length < settings.numLeft || settings.numLeft == -1) && (left.length <= right.length || right.length >= settings.numRight)) {
            left.push(name);
        } else if (right.length < settings.numRight || settings.numRight == -1) {
            right.push(name);
        }
    }
    busy = false;
};
eventSource.on(event_types.GROUP_UPDATED, ()=>updateMembers());




const getOrder = (members)=>{
    const o = [];

    const mesList = chat.filter(it=>!it.is_system && !it.is_user && members.indexOf(it.name) > -1).toReversed();
    for (const mes of mesList) {
        if (o.indexOf(mes.name) == -1) {
            o.unshift(mes.name);
            if (o.length >= members.length) {
                break;
            }
        }
    }
    return o;
};
let restarting = false;
const restart = debounceAsync(async()=>{
    if (restarting) return;
    restarting = true;
    log('restart');
    end();
    await delay(Math.max(550, settings.transition + 150));
    await start();
    restarting = false;
});
const start = async()=>{
    if (!settings.isEnabled) return;
    log('start');
    document.querySelector('#expression-wrapper').style.opacity = '0';
    root = document.createElement('div'); {
        root.classList.add('stge--root');
        root.style.setProperty('--scale-speaker', settings.scaleSpeaker);
        root.style.setProperty('--offset', settings.offset);
        root.style.setProperty('--transition', settings.transition);
        root.style.setProperty('--scale-dropoff', settings.scaleDropoff);
        root.style.setProperty('--position', settings.position);
        document.body.append(root);
    }
    const context = getContext();
    groupId = context.groupId;
    chatId = context.chatid;
    messageRendered();
    mo.observe(document.querySelector('#expression-wrapper'), { childList:true, subtree:true, attributes:true });
    document.querySelector('#expression-wrapper').style.opacity = '0';
};
const end = ()=>{
    log('end');
    mo.disconnect();
    groupId = null;
    chatId = null;
    current = null;
    nameList = [];
    left = [];
    right = [];
    root?.remove();
    root = null;
    while (imgs.length > 0) {
        imgs.pop();
    }
    document.querySelector('#expression-wrapper').style.opacity = '';
    log('/end');
};
