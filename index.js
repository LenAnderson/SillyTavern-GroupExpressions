import { chat, eventSource, event_types, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings, getContext } from '../../../extensions.js';
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

const initSettings = () => {
    settings = Object.assign({
        isEnabled: true,
        numLeft: -1,
        numRight: 2,
        scaleSpeaker: 120,
        offset: 25,
        transition: 400,
        expression: 'joy',
        scaleDropoff: 3,
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
                    <label>
                        Number of characters on the left (-1 = unlimited)
                        <input type="number" class="text_pole" min="0" id="stge--numLeft" value="${settings.numLeft}">
                    </label>
                </div>
                <div class="flex-container">
                    <label>
                        Number of characters on the right (-1 = unlimited)
                        <input type="number" class="text_pole" min="0" id="stge--numRight" value="${settings.numRight}">
                    </label>
                </div>
                <div class="flex-container">
                    <label>
                        Scale of current speaker (percentage; 100 = no change; <100 = shrink; >100 = grow)
                        <input type="number" class="text_pole" min="0" id="stge--scaleSpeaker" value="${settings.scaleSpeaker}">
                    </label>
                </div>
                <div class="flex-container">
                    <label>
                        Offset of characters to the side (percentage; 0 = all stacked in center; <100 = overlapping; >100 = no overlap)
                        <input type="number" class="text_pole" min="0" id="stge--offset" value="${settings.offset}">
                    </label>
                </div>
                <div class="flex-container">
                    <label>
                        Scale dropoff (percentage; 0 = no change; >0 = chars to the side get smaller; >0 = chars to the side get larger)
                        <input type="number" class="text_pole" id="stge--scaleDropoff" value="${settings.scaleDropoff}">
                    </label>
                </div>
                <div class="flex-container">
                    <label>
                        Animation duration (milliseconds)
                        <input type="number" class="text_pole" min="0" id="stge--transition" value="${settings.transition}">
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
    document.querySelector('#stge--isEnabled').addEventListener('click', ()=>{
        settings.isEnabled = document.querySelector('#stge--isEnabled').checked;
        saveSettingsDebounced();
        restart();
    });
    document.querySelector('#stge--numLeft').addEventListener('change', ()=>{
        settings.numLeft = Number(document.querySelector('#stge--numLeft').value);
        saveSettingsDebounced();
        restart();
    });
    document.querySelector('#stge--numRight').addEventListener('change', ()=>{
        settings.numRight = Number(document.querySelector('#stge--numRight').value);
        saveSettingsDebounced();
        restart();
    });
    document.querySelector('#stge--scaleSpeaker').addEventListener('change', ()=>{
        settings.scaleSpeaker = Number(document.querySelector('#stge--scaleSpeaker').value);
        saveSettingsDebounced();
        restart();
    });
    document.querySelector('#stge--offset').addEventListener('change', ()=>{
        settings.offset = Number(document.querySelector('#stge--offset').value);
        saveSettingsDebounced();
        restart();
    });
    document.querySelector('#stge--scaleDropoff').addEventListener('change', ()=>{
        settings.scaleDropoff = Number(document.querySelector('#stge--scaleDropoff').value);
        saveSettingsDebounced();
        restart();
    });
    document.querySelector('#stge--transition').addEventListener('change', ()=>{
        settings.transition = Number(document.querySelector('#stge--transition').value);
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
        restart();
    });
};

const chatChanged = async ()=>{
    const context = getContext();
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
    while (settings.isEnabled && groupId) {
        if (!busy) {
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




const updateMembers = async()=>{
    if (busy) return;
    busy = true;
    const context = getContext();
    const group = context.groups.find(it=>it.id == groupId);
    const members = group.members.map(m=>context.characters.find(c=>c.avatar == m)).filter(it=>it);
    const names = getOrder(members.map(it=>it.name));
    names.push(...members.filter(m=>!names.find(it=>it == m.name)).map(it=>it.name));
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
    for (const name of added) {
        let dir = 1;
        let order = 0;
        nameList.push(name);
        if (!current) {
            current = name;
        } else if ((left.length < settings.numLeft || settings.numLeft == -1) && (left.length <= right.length || right.length >= settings.numRight)) {
            left.push(name);
            dir = -1;
            order = left.length;
        } else if (right.length < settings.numRight || settings.numRight == -1) {
            right.push(name);
            dir = 1;
            order = right.length;
        }
        const wrap = document.createElement('div'); {
            imgs.push(wrap);
            wrap.classList.add('stge--wrapper');
            wrap.setAttribute('data-character', name);
            // wrap.classList.add('stge--exit');
            // if (dir != 0) {
            // }
            // wrap.style.setProperty('--dir', dir);
            // wrap.style.setProperty('--order', order);
            const img = document.createElement('img'); {
                img.classList.add('stge--img');
                img.src = `/characters/${name}/${settings.expression}.png`;
                wrap.append(img);
            }
            // root.append(wrap);
        }
        // await delay(50);
        // wrap.classList.remove('stge--exit');
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
const restart = debounceAsync(async()=>{
    end();
    await delay(500);
    await start();
});
const start = async()=>{
    if (!settings.isEnabled) return;
    document.querySelector('#expression-wrapper').style.opacity = '0';
    root = document.createElement('div'); {
        root.classList.add('stge--root');
        root.style.setProperty('--scale-speaker', settings.scaleSpeaker);
        root.style.setProperty('--offset', settings.offset);
        root.style.setProperty('--transition', settings.transition);
        root.style.setProperty('--scale-dropoff', settings.scaleDropoff);
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
};
