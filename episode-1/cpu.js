const createMemory = require("./create-memory");
const instructions = require("./instructions");

class CPU {
    constructor(memory) {
        this.memory = memory;

        this.registerNames = [
            'ip', 'acc',
            'r1', 'r2', 'r3', 'r4',
            'r5', 'r6', 'r7', 'r8',
            'sp', 'fp',
        ]

        this.registers = createMemory(this.registerNames.length * 2);

        this.registerMap = this.registerNames.reduce((map, name, i) => {
            map[name] = i * 2;

            return map;
        }, {});

        this.setRegister('sp', 0xffff - 1);
        this.setRegister('fp', 0xffff - 1);

        this.stackFrameSize = 0;
    }

    debug() {
        console.log();

        this.registerNames.forEach(name => {
            console.log(`${name}: 0x${this.getRegister(name).toString(16).padStart(4, '0')}`);
        });

        console.log();
    }

    viewMemoryAt(address, n = 8) {
        const nextNBytes = Array.from({ length: n }, (_, i) =>
            this.memory.getUint8(address + i)
        ).map(value => `0x${value.toString(16).padStart(2, '0')}`);

        console.log(`0x${address.toString(16).padStart(4, '0')}: ${nextNBytes.join(' ')}`);
    }

    getRegister(name) {
        if (!(name in this.registerMap)) {
            throw new Error(`getRegister: No such register '${name}'`);
        }

        return this.registers.getUint16(this.registerMap[name]);
    }

    setRegister(name, value) {
        if (!(name in this.registerMap)) {
            throw new Error(`setRegister: No such register '${name}'`);
        }

        return this.registers.setUint16(this.registerMap[name], value);
    }

    fetch8() {
        const nextInstructionAddress = this.getRegister('ip')
        const instruction = this.memory.getUint8(nextInstructionAddress);
        this.setRegister('ip', nextInstructionAddress + 1);
        return instruction;
    }
    fetch16() {
        const nextInstructionAddress = this.getRegister('ip')
        const instruction = this.memory.getUint16(nextInstructionAddress);
        this.setRegister('ip', nextInstructionAddress + 2);
        return instruction;
    }

    fetchRegisterIndex() {
        return (this.fetch8() % this.registerNames.length) * 2;
    }

    push(value) {
        const spAddress = this.getRegister('sp');
        this.memory.setUint16(spAddress, value);
        this.setRegister('sp', spAddress - 2);
        this.stackFrameSize += 2;
    }

    pop() {
        const nextSpAddress = this.getRegister('sp') + 2;
        this.setRegister('sp', nextSpAddress);
        this.stackFrameSize -= 2;
        return this.memory.getUint16(nextSpAddress);
    }

    pushState() {
        this.push(this.getRegister('r1'));
        this.push(this.getRegister('r2'));
        this.push(this.getRegister('r3'));
        this.push(this.getRegister('r4'));
        this.push(this.getRegister('r5'));
        this.push(this.getRegister('r6'));
        this.push(this.getRegister('r7'));
        this.push(this.getRegister('r8'));
        this.push(this.getRegister('ip'));
        this.push(this.stackFrameSize + 2);

        this.setRegister('fp', this.getRegister('sp'));
        this.stackFrameSize = 0;
    }

    popState() {
        const fpAdrdress = this.getRegister('fp');
        this.setRegister('sp', fpAdrdress);

        this.stackFrameSize = this.pop();
        const stackFrameSize = this.stackFrameSize;

        this.setRegister('ip', this.pop());
        this.setRegister('r8', this.pop());
        this.setRegister('r7', this.pop());
        this.setRegister('r6', this.pop());
        this.setRegister('r5', this.pop());
        this.setRegister('r4', this.pop());
        this.setRegister('r3', this.pop());
        this.setRegister('r2', this.pop());
        this.setRegister('r1', this.pop());

        const nArgs = this.pop();
        for (let i = 0; i < nArgs; i++) {
            this.pop();
        }

        this.setRegister('fp', fpAdrdress + stackFrameSize);
    }

    execute(instruction) {
        switch (instruction) {

            case instructions.MOV_LIT_REG:
                {
                    const literal = this.fetch16();
                    const register = this.fetchRegisterIndex()
                    this.registers.setUint16(register, literal);
                    return;
                }

            case instructions.MOV_REG_REG:
                {
                    const registerFrom = this.fetchRegisterIndex()
                    const registerTo = this.fetchRegisterIndex()
                    const value = this.registers.getUint16(registerFrom);
                    this.registers.setUint16(registerTo, value);
                    return;
                }
            case instructions.MOV_REG_MEM:
                {
                    const register = this.fetchRegisterIndex()
                    const address = this.fetch16();
                    const value = this.registers.getUint16(register);
                    this.memory.setUint16(address, value);
                    return;
                }

            case instructions.MOV_MEM_REG:
                {
                    const address = this.fetch16();
                    const register = this.fetchRegisterIndex()
                    const value = this.memory.getUint16(address);
                    this.registers.setUint16(register, value);
                    return;
                }

            case instructions.MOV_LIT_MEM: {
                const value = this.fetch16();
                const address = this.fetch16();
                this.memory.setUint16(address, value);
                return;
            }

            case instructions.MOV_REG_PTR_REG: {
                const r1 = this.fetchRegisterIndex();
                const r2 = this.fetchRegisterIndex();
                const ptr = this.registers.getUint16(r1);
                const value = this.memory.getUint16(ptr);
                this.registers.setUint16(r2, value);
                return;
            }

            case instructions.MOV_LIT_OFF_REG: {
                const baseAddress = this.fetch16();
                const r1 = this.fetchRegisterIndex();
                const r2 = this.fetchRegisterIndex();
                const offset = this.registers.getUint16(r1);
                const value = this.memory.getUint16(baseAddress + offset);
                this.registers.setUint16(r2, value);
                return;
            }

            case instructions.ADD_REG_REG:
                {
                    const r1 = this.fetchRegisterIndex();
                    const r2 = this.fetchRegisterIndex();
                    const registerValue1 = this.registers.getUint16(r1);
                    const registerValue2 = this.registers.getUint16(r2);
                    this.setRegister('acc', registerValue1 + registerValue2);
                    return;
                }

            case instructions.ADD_LIT_REG:
                {
                    const literal = this.fetch16();
                    const r1 = this.fetchRegisterIndex();
                    const registerValue1 = this.registers.getUint16(r1);
                    this.setRegister('acc', literal + registerValue1);
                    return;
                }

            case instructions.SUB_LIT_REG:
                {
                    const literal = this.fetch16();
                    const r1 = this.fetchRegisterIndex();
                    const registerValue = this.registers.getUint16(r1);
                    this.setRegister('acc', literal - registerValue);
                    return;
                }

            case instructions.SUB_REG_LIT:
                {
                    const r1 = this.fetchRegisterIndex();
                    const literal = this.fetch16();
                    const registerValue = this.registers.getUint16(r1);
                    this.setRegister('acc', literal - registerValue);
                    return;
                }

            case instructions.SUB_REG_REG:
                {
                    const r1 = this.fetchRegisterIndex();
                    const r2 = this.fetchRegisterIndex();
                    const registerValue1 = this.registers.getUint16(r1);
                    const registerValue2 = this.registers.getUint16(r2);
                    this.setRegister('acc', registerValue1 - registerValue2);
                    return;
                }

            case instructions.MUL_LIT_REG:
                {
                    const literal = this.fetch16();
                    const r1 = this.fetchRegisterIndex();
                    const registerValue = this.registers.getUint16(r1);
                    this.setRegister('acc', literal * registerValue);
                    return;
                }

            case instructions.MUL_REG_REG:
                {
                    const r1 = this.fetchRegisterIndex();
                    const r2 = this.fetchRegisterIndex();
                    const registerValue1 = this.registers.getUint16(r1);
                    const registerValue2 = this.registers.getUint16(r2);
                    this.setRegister('acc', registerValue1 * registerValue2);
                    return;
                }

            case instructions.INC_REG: {
                const r1 = this.fetchRegisterIndex();
                const newValue = this.registers.getUint16(r1) + 1;
                this.registers.setUint16(r1, newValue);
                return;
            }

            case instructions.DEC_REG: {
                const r1 = this.fetchRegisterIndex();
                const newValue = this.registers.getUint16(r1) - 1;
                this.registers.setUint16(r1, newValue);
                return;
            }

            case instructions.LSF_REG_LIT: {
                const r1 = this.fetchRegisterIndex();
                const literal = this.fetch8();
                const newValue = this.registers.getUint16(r1) << literal;
                this.registers.setUint16(r1, newValue);
                return;
            }

            case instructions.LSF_REG_REG: {
                const r1 = this.fetchRegisterIndex();
                const r2 = this.fetchRegisterIndex();
                const registerValue = this.registers.getUint16(r1);
                const shiftBy = this.registers.getUint16(r2);
                this.registers.setUint16(r1, registerValue << shiftBy);
                return;
            }

            case instructions.RSF_REG_LIT: {
                const r1 = this.fetchRegisterIndex();
                const literal = this.fetch8();
                const newValue = this.registers.getUint16(r1) >> literal;
                this.registers.setUint16(r1, newValue);
                return;
            }

            case instructions.RSF_REG_REG: {
                const r1 = this.fetchRegisterIndex();
                const r2 = this.fetchRegisterIndex();
                const registerValue = this.registers.getUint16(r1);
                const shiftBy = this.registers.getUint16(r2);
                this.registers.setUint16(r1, registerValue >> shiftBy);
                return;
            }

            case instructions.AND_REG_LIT: {
                const r1 = this.fetchRegisterIndex();
                const literal = this.fetch16();
                const res = this.registers.getUint16(r1) & literal;
                this.registers.setUint16(r1, res);
                return;
            }

            case instructions.AND_REG_REG: {
                const r1 = this.fetchRegisterIndex();
                const r2 = this.fetchRegisterIndex();
                const registerValue1 = this.registers.getUint16(r1);
                const registerValue2 = this.registers.getUint16(r2);
                this.registers.setUint16(r1, registerValue1 & registerValue2);
                return;
            }

            case instructions.OR_REG_LIT: {
                const r1 = this.fetchRegisterIndex();
                const literal = this.fetch16();
                const res = this.registers.getUint16(r1) | literal;
                this.registers.setUint16(r1, res);
                return;
            }

            case instructions.OR_REG_REG: {
                const r1 = this.fetchRegisterIndex();
                const r2 = this.fetchRegisterIndex();
                const registerValue1 = this.registers.getUint16(r1);
                const registerValue2 = this.registers.getUint16(r2);
                this.registers.setUint16(r1, registerValue1 | registerValue2);
                return;
            }

            case instructions.XOR_REG_LIT: {
                const r1 = this.fetchRegisterIndex();
                const literal = this.fetch16();
                const res = this.registers.getUint16(r1) ^ literal;
                this.registers.setUint16(r1, res);
                return;
            }

            case instructions.XOR_REG_REG: {
                const r1 = this.fetchRegisterIndex();
                const r2 = this.fetchRegisterIndex();
                const registerValue1 = this.registers.getUint16(r1);
                const registerValue2 = this.registers.getUint16(r2);
                this.registers.setUint16(r1, registerValue1 ^ registerValue2);
                return;
            }

            case instructions.NOT: {
                const r1 = this.fetchRegisterIndex();
                const registerValue = this.registers.getUint16(r1);
                this.registers.setUint16(r1, (~registerValue) & 0xffff);
                return;
            }

            case instructions.JMP_NOT_EQ:
                {
                    const value = this.fetch16();
                    const address = this.fetch16();

                    if (value != this.getRegister('acc')) {
                        this.setRegister('ip', address);
                    }

                    return;
                }

            case instructions.JNE_REG:
                {
                    const r1 = this.fetchRegisterIndex();
                    const value = this.registers.getUint16(r1);
                    const address = this.fetch16();
                    if (value != this.getRegister('acc')) {
                        this.setRegister('ip', address);
                    }
                    return;
                }

            case instructions.JEQ_REG:
                {
                    const r1 = this.fetchRegisterIndex();
                    const value = this.registers.getUint16(r1);
                    const address = this.fetch16();
                    if (value == this.getRegister('acc')) {
                        this.setRegister('ip', address);
                    }
                    return;
                }

            case instructions.JEQ_LIT:
                {
                    const value = this.fetch16();
                    const address = this.fetch16();
                    if (value == this.getRegister('acc')) {
                        this.setRegister('ip', address);
                    }
                    return;
                }

            case instructions.JLT_REG:
                {
                    const r1 = this.fetchRegisterIndex();
                    const value = this.registers.getUint16(r1);
                    const address = this.fetch16();
                    if (value < this.getRegister('acc')) {
                        this.setRegister('ip', address);
                    }
                    return;
                }

            case instructions.JLT_LIT:
                {
                    const value = this.fetch16();
                    const address = this.fetch16();
                    if (value < this.getRegister('acc')) {
                        this.setRegister('ip', address);
                    }
                    return;
                }

            case instructions.JGT_REG:
                {
                    const r1 = this.fetchRegisterIndex();
                    const value = this.registers.getUint16(r1);
                    const address = this.fetch16();
                    if (value > this.getRegister('acc')) {
                        this.setRegister('ip', address);
                    }
                    return;
                }

            case instructions.JGT_LIT:
                {
                    const value = this.fetch16();
                    const address = this.fetch16();
                    if (value > this.getRegister('acc')) {
                        this.setRegister('ip', address);
                    }
                    return;
                }

            case instructions.JLE_REG:
                {
                    const r1 = this.fetchRegisterIndex();
                    const value = this.registers.getUint16(r1);
                    const address = this.fetch16();
                    if (value <= this.getRegister('acc')) {
                        this.setRegister('ip', address);
                    }
                    return;
                }

            case instructions.JLE_LIT:
                {
                    const value = this.fetch16();
                    const address = this.fetch16();
                    if (value <= this.getRegister('acc')) {
                        this.setRegister('ip', address);
                    }
                    return;
                }

            case instructions.JGE_REG:
                {
                    const r1 = this.fetchRegisterIndex();
                    const value = this.registers.getUint16(r1);
                    const address = this.fetch16();
                    if (value >= this.getRegister('acc')) {
                        this.setRegister('ip', address);
                    }
                    return;
                }

            case instructions.JGT_LIT:
                {
                    const value = this.fetch16();
                    const address = this.fetch16();
                    if (value >= this.getRegister('acc')) {
                        this.setRegister('ip', address);
                    }
                    return;
                }

            case instructions.PSH_LIT: {
                const value = this.fetch16();
                this.push(value);
                return;
            }

            case instructions.PSH_REG: {
                const registerIndex = this.fetchRegisterIndex();
                this.push(this.registers.getUint16(registerIndex));
                return;
            }

            case instructions.POP: {
                const registerIndex = this.fetchRegisterIndex();
                const value = this.pop();
                this.registers.setUint16(registerIndex, value);
                return;
            }

            case instructions.CAL_LIT: {
                const address = this.fetch16();
                this.pushState();
                this.setRegister('ip', address);
                return;
            }

            case instructions.CAL_REG: {
                const registerIndex = this.fetchRegisterIndex();
                const address = this.registers.getUint16(registerIndex);
                this.pushState();
                this.setRegister('ip', address);
                return;
            }

            case instructions.RET: {
                this.popState();
                return;
            }
            case instructions.HLT: {
                return true;
            }
            default:
                return;
        }
    }

    step() {
        const instruction = this.fetch8();
        return this.execute(instruction);
    }

    run() {
        const halt = this.step();
        if (!halt) {
            setImmediate(() => this.run());
        }
    }
}

module.exports = CPU;