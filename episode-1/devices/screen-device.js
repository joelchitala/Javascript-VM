const moveTo = (x, y) => {
    process.stdout.write(`\x1b[${y};${x}H`);
}
const eraseScreen = () => {
    process.stdout.write(`\x1b[2J`);
}

const setBold = () => {
    process.stdout.write(`\x1b[1m`);
}

const setRegular = () => {
    process.stdout.write(`\x1b[0m`);
}

const createScreenDevice = () => {
    const runCommand = (command) => {
        switch (command) {
            case 0x01:
                setBold();
                break;
            case 0x02:
                setRegular();
                break;
            case 0xff:
                eraseScreen();
                break;
            default:
                break;
        }
    }
    return {
        getUint8: () => 0,
        getUint16: () => 0,
        setUint16: (address, data) => {
            const command = (data & 0xff00) >> 8;
            const charValue = data & 0x00ff;
            runCommand(command);

            const x = (address % 16) + 1;
            const y = Math.floor(address / 16) + 1;
            moveTo(x * 2, y);
            const character = String.fromCharCode(charValue);
            process.stdout.write(character);
        },
    }
}

module.exports = createScreenDevice;