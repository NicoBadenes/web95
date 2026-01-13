/**
 * @file src/os/filesystem/disk.js
 * @description Define la estructura inicial del disco duro (JSON Tree).
 */

export const INITIAL_DISK = {
    //La raiz (C:)
    id: 'root',
    type: 'dir',
    children: {
        //Carpeta del Sistema
        'system': {
            type: 'dir',
            children: {
                'readme.txt': {
                    type: 'file',
                    content: 'Web95 Kernel v1.0\nBuilt with Vanilla JS.'
                },
                'config.sys':{
                    type: 'file',
                    content: 'DISPLAY=VGA\nMEM=640K'
                }
            }
        },

        //Carpeta de Usuario
        'documents': {
            type: 'dir',
            children: {
                'todo.txt':{
                    type: 'file',
                    content: '- Finish VFS\n- Build Notepad\n Play Snake'
                },
                'secret.txt': {
                    type: 'file',
                    content: 'The cake is a lie.'
                }
            }
        },

        'logo.png': {
            type: 'file',
            content: './images/web95LOGO.png'
        },

        //Archivo suelto en la raiz
        'welcome.msg': {
            type: 'file',
            content: 'Welcome to Web95'
        },

        'games': {
            type: 'dir',
            children: {
                'snake.exe': {
                    type: 'file',
                    content: 'Binary content' //Placeholder
                }
            }
        }
    }
};