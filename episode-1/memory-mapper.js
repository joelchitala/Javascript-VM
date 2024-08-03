class MemoryMapper {
    constructor() {
        this.regions = [];
    }

    map(device, start, end, remap = true) {
        const region = {
            device,
            start,
            end,
            remap,
        };

        this.regions.unshift(region);

        return () => {
            this.regions = this.regions.filter(x => x !== region);
        }
    }

    findRegion(address) {
        const region = this.regions.find(r => address >= r.start && address <= r.end);
        if (!region) {
            throw new Error(`No  memory found for address ${address}`);
        }

        return region;
    }

    getAddress(region, address) {
        return region.remap ? address - region.start : address;
    }


    getUint8(address) {
        const region = this.findRegion(address);
        return region.device.getUint8(this.getAddress(region, address));
    }

    getUint16(address) {
        const region = this.findRegion(address);
        return region.device.getUint16(this.getAddress(region, address));
    }

    setUint8(address, value) {
        const region = this.findRegion(address);
        return region.device.setUint8(this.getAddress(region, address), value);
    }

    setUint16(address, value) {
        const region = this.findRegion(address);
        return region.device.setUint16(this.getAddress(region, address), value);
    }
}

module.exports = MemoryMapper; 