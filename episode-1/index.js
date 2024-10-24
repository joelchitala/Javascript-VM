const readline = require('readline');
const createMemory = require('./create-memory');
const CPU = require('./cpu');
const instructions = require('./instructions');
const MemoryMapper = require('./memory-mapper');
const createScreenDevice = require('./devices/screen-device');

const IP = 0;
const ACC = 1;
const R1 = 2;
const R2 = 3;
const R3 = 4;
const R4 = 5;
const R5 = 6;
const R6 = 7;
const R7 = 8;
const R8 = 9;
const SP = 10;
const FP = 11;

const MM = new MemoryMapper();

const memory = createMemory(256 * 256);
MM.map(memory, 0, 0xffff);

// Screen Device
MM.map(createScreenDevice(), 0x3000, 0x30ff, true);

const writableBytes = new Uint8Array(memory.buffer);

const cpu = new CPU(MM);

let i = 0;

const writeCharToScreen = (char, command = 0x00, position) => {
    writableBytes[i++] = instructions.MOV_LIT_REG;
    writableBytes[i++] = command;
    writableBytes[i++] = char.charCodeAt(0);
    writableBytes[i++] = R1;

    writableBytes[i++] = instructions.MOV_REG_MEM;
    writableBytes[i++] = R1;
    writableBytes[i++] = 0x30;
    writableBytes[i++] = position;
}

// "Hello World from javascript VM".split('').forEach((char, index) => {
//     writeCharToScreen(char, index);
// });

// writeCharToScreen(' ', 0xff, 0);

// for (let index = 0; index <= 0xff; index++) {
//     const command = index % 2 === 0 ? 0x01 : 0x02;
//     writeCharToScreen('x', command, index);
// }

writableBytes[i++] = instructions.MOV_LIT_REG;
writableBytes[i++] = 0x12;
writableBytes[i++] = 0x34;
writableBytes[i++] = R1;

writableBytes[i++] = instructions.MOV_LIT_REG;
writableBytes[i++] = 0xAB;
writableBytes[i++] = 0xCD;
writableBytes[i++] = R2;

writableBytes[i++] = instructions.ADD_REG_REG;
writableBytes[i++] = R1;
writableBytes[i++] = R2;

writableBytes[i++] = instructions.MOV_REG_MEM;
writableBytes[i++] = ACC;
writableBytes[i++] = 0x01;
writableBytes[i++] = 0x00;


writableBytes[i++] = instructions.HLT;

// cpu.run();

// cpu.debug();
// cpu.viewMemoryAt(cpu.getRegister('ip'));
// cpu.viewMemoryAt(0x0100);

cpu.step();
cpu.debug();
// cpu.viewMemoryAt(cpu.getRegister('acc'));

const rl = readline.createInterface(
    {
        input: process.stdin,
        output: process.stdout,
    }
);

rl.on('line', () => {
    cpu.step();
    cpu.debug();
    cpu.viewMemoryAt(cpu.getRegister('acc'));
    // cpu.viewMemoryAt(0x0100);
})





