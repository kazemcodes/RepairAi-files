# Board

## Main Board (PCB)

### Board Layout

#### Top Side Components
| Component | Location | Notes |
|-----------|----------|-------|
| Display Connector | Top center | 40-pin ZIF |
| Touch Controller | Top left | IC |
| Display Driver | Top right | IC |

#### Bottom Side Components
| Component | Location | Notes |
|-----------|----------|-------|
| CPU/SoC | Center | BGA package |
| RAM | Under CPU | PoP package |
| Flash Storage | Bottom center | eMMC |
| Power Management IC | Bottom left | PMIC |
| Audio Codec | Bottom right | IC |

### Connectors
- Battery connector: J1
- Display connector: J2 (40-pin ZIF)
- Touch panel connector: J3 (6-pin ZIF)
- Front sensor connector: J4
- Rear camera connector: J5
- Button flex connector: J6

### Test Points
| Test Point | Purpose |
|------------|---------|
| TP1 | VBAT (Battery voltage) |
| TP2 | VBUS (USB power) |
| TP3 | GND (Ground) |
| TP4 | PWR_ON (Power on signal) |
| TP5 | RST (Reset) |

### Notes
- Handle board by edges only
- Avoid touching components directly
- Use proper ESD precautions
- Check for corrosion or damage
