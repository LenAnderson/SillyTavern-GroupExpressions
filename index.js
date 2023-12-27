import { chat, eventSource, event_types } from '../../../../script.js';
import { getContext } from '../../../extensions.js';
import { delay } from '../../../utils.js';

const log = (...msg) => console.log('[GE]', ...msg);




/**@type {String} */
let groupId;
/**@type {String} */
let chatId;
/**@type {HTMLElement} */
let root;
/**@type {HTMLImageElement[]} */
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
    root = document.createElement('div'); {
        root.classList.add('stge--root');
        document.body.append(root);
    }
    mo = new MutationObserver(muts=>{
        if (busy) return;
        const lastCharMes = chat.toReversed().find(it=>!it.is_user && !it.is_system && nameList.find(o=>it.name == o));
        const img = imgs.find(it=>it.getAttribute('data-character') == lastCharMes?.name);
        if (img && document.querySelector('#expression-image').src) {
            img.src = document.querySelector('#expression-image').src;
        }
    });
};
eventSource.on(event_types.APP_READY, ()=>init());

const chatChanged = ()=>{
    const context = getContext();
    if (context.groupId) {
        end();
        start();
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
    while (groupId) {
        if (!busy) {
            await updateMembers();
            const lastMes = chat.toReversed().find(it=>!it.is_system && nameList.find(o=>it.name == o));
            const lastCharMes = chat.toReversed().find(it=>!it.is_user && !it.is_system && nameList.find(o=>it.name == o));
            if (lastCharMes) {
                if (lastCharMes.name != current) {
                    if (left.indexOf(lastCharMes.name) > -1) {
                        left.splice(left.indexOf(lastCharMes.name), 1);
                    } else if (right.indexOf(lastCharMes.name) > -1) {
                        right.splice(right.indexOf(lastCharMes.name), 1);
                    }
                    if (left.length <= right.length || right.length >= 2) {
                        left.unshift(current);
                    } else {
                        right.unshift(current);
                    }
                }
                current = lastCharMes.name;
            }
            const img = imgs.find(it=>it.getAttribute('data-character') == lastCharMes?.name);
            imgs
                .filter(it=>(it != img || lastMes != lastCharMes) && it.closest('.stge--wrapper').classList.contains('stge--last'))
                .forEach(it=>it.closest('.stge--wrapper').classList.remove('stge--last'))
            ;
            if (lastMes == lastCharMes) {
                img?.closest('.stge--wrapper')?.classList?.add('stge--last');
            }
            imgs.find(it=>it.getAttribute('data-character') == current)?.closest('.stge--wrapper').style.setProperty('--order', 0);
            imgs.find(it=>it.getAttribute('data-character') == current)?.closest('.stge--wrapper').style.setProperty('--dir', 0);
            left.forEach((name,idx)=>{
                const wrap = imgs.find(it=>it.getAttribute('data-character') == name)?.closest('.stge--wrapper');
                wrap?.style?.setProperty('--order', String(idx + 1));
                wrap?.style?.setProperty('--dir', '-1');
            });
            right.forEach((name,idx)=>{
                const wrap = imgs.find(it=>it.getAttribute('data-character') == name)?.closest('.stge--wrapper');
                wrap?.style?.setProperty('--order', String(idx + 1));
                wrap?.style?.setProperty('--dir', '1');
            });
        }
        await delay(500);
    }
};
// eventSource.on(event_types.USER_MESSAGE_RENDERED, ()=>messageRendered());
// eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, ()=>messageRendered());




const updateMembers = async()=>{
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
        img.closest('.stge--wrapper').classList.add('stge--exit');
        await delay(550);
        img.remove();
    }
    for (const name of added) {
        let dir = 0;
        let order = 0;
        nameList.push(name);
        if (!current) {
            current = name;
        } else if (left.length <= right.length || right.length >= 2) {
            left.push(name);
            dir = -1;
            order = left.length;
        } else {
            right.push(name);
            dir = 1;
            order = right.length;
        }
        const wrap = document.createElement('div'); {
            wrap.classList.add('stge--wrapper');
            wrap.classList.add('stge--exit');
            wrap.style.setProperty('--dir', dir);
            wrap.style.setProperty('--order', order);
            const img = document.createElement('img'); {
                imgs.push(img);
                img.classList.add('stge--img');
                img.setAttribute('data-character', name);
                img.src = `/characters/${name}/neutral.png`;
                wrap.append(img);
            }
            root.append(wrap);
        }
        await delay(50);
        wrap.classList.remove('stge--exit');
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
const start = ()=>{
    const context = getContext();
    groupId = context.groupId;
    chatId = context.chatid;
    const group = context.groups.find(it=>it.id == groupId);
    const members = group.members.map(m=>context.characters.find(c=>c.avatar == m)).filter(it=>it);
    const names = getOrder(members.map(it=>it.name));
    names.push(...members.filter(m=>!names.find(it=>it == m.name)).map(it=>it.name));
    names.forEach((name,idx)=>{
        const m = members.find(it=>it.name == name);
        nameList.push(m.name);
        if (idx == 0) {
            current = m.name;
        } else {
            if (left.length <= right.length || right.length >= 2) {
                left.push(m.name);
            } else {
                right.push(m.name);
            }
        }
        const wrap = document.createElement('div'); {
            wrap.classList.add('stge--wrapper');
            const img = document.createElement('img'); {
                imgs.push(img);
                img.classList.add('stge--img');
                img.setAttribute('data-character', m.name);
                img.src = `/characters/${m.name}/neutral.png`;
                wrap.append(img);
            }
            root.append(wrap);
        }
    });
    document.querySelector('#expression-wrapper').style.opacity = '0';
    mo.observe(document.querySelector('#expression-wrapper'), { childList:true, subtree:true, attributes:true });
    messageRendered();
};
const end = ()=>{
    mo.disconnect();
    groupId = null;
    chatId = null;
    nameList = [];
    left = [];
    right = [];
    while (imgs.length > 0) {
        imgs.pop().closest('.stge--wrapper').remove();
    }
};
