## Spectoda Ethernet configuration

This document describes how to configure and use Ethernet functionality in Spectoda devices.

### Configuration

Ethernet is configured through a JSON object in Controller config. Here is a complete example:

```json
{
  "ethernet": {
    "variant": "LAN8720",
    "type": "LAN8720",
    "ip": "20.0.0.4",
    "gateway": "20.0.0.1",
    "mask": "255.255.255.0",
    "dns": "8.8.8.8",
    "hostname": "spectoda"
  }
}
```

#### Basic configuration options

| Parameter | Type | Description | Default value |
| --- | --- | --- | --- |
| `enable` | boolean | Enables or disables Ethernet functionality | `true` if `ethernet` is defined in JSON |
| `ip` | string | Static IP address of the device | DHCP if not set |
| `gateway` | string | Gateway IP address | Required when using a static IP |
| `mask` | string | Network mask | Required when using a static IP |
| `dns` | string | DNS server IP address | Optional |
| `hostname` | string | Device name on the network | Optional |

#### Hardware configuration

**Predefined variants**

Use the `variant` parameter to select a predefined hardware configuration:

| Variant | Description |
| --- | --- |
| `LAN8720` | Standard LAN8720 configuration |
| `OLIMEXPOE` | Configuration for the Olimex PoE board |
| `OLIMEXPOE2` | Configuration for the Olimex PoE 2 board |

**Ethernet PHY type**

Use the `type` parameter to specify the Ethernet PHY chip:

| Type | Description |
| --- | --- |
| `IP101` | IP101 PHY |
| `RTL8201` | RTL8201 PHY |
| `LAN8720` | LAN8720 PHY |
| `DP83848` | DP83848 PHY |
| `KSZ8041` | KSZ8041 PHY |
| `KSZ8081` | KSZ8081 PHY |

#### Advanced configuration

These parameters allow fine-tuning of the Ethernet hardware configuration:

| Parameter | Type | Description | Default value | Valid values |
| --- | --- | --- | --- | --- |
| `phydet` | number | PHY address detection. Defines the PHY address used for communication. | 0 | -1 (auto-detection), 0-31 |
| `phymdc` | number | PHY MDC pin. Management Data Clock pin for the MDIO interface. | 23 | GPIO 0-39 |
| `phymdio` | number | PHY MDIO pin. Management Data Input/Output pin for the MDIO interface. | 18 | GPIO 0-39 |
| `phyen` | number | PHY Enable pin. Used to enable or disable the PHY chip. | 12 | GPIO 0-39 |
| `phyrst` | number | PHY Reset pin. Hardware reset pin for the PHY chip. | -1 | -1 (disabled), GPIO 0-39 |
| `rmiipin` | number | RMII Clock pin. Defines the GPIO used for the RMII clock signal. | 0 | 0 (EMAC\_APPL\_CLK\_OUT\_GPIO), 16-17 |
| `rmiimode` | number | RMII Clock Mode. Configures the RMII clock source. | 2 | 0 (GPIO0\_IN), 1 (GPIO0\_OUT), 2 (EMAC\_CLK\_OUT), 3 (EMAC\_CLK\_OUT\_180) |
| `timeout` | number | SW Reset Timeout in milliseconds. Maximum wait time for PHY reset. | 1000 | 100-10000 |

**Important implementation details:**

1. **PHY address detection (`phydet`)**
   * Use -1 for automatic detection.
   * Values 0-31 specify a fixed PHY address.
   * Most configurations work with address 0.
2. **Clock configuration (`rmiimode`)**
   * EMAC\_CLK\_OUT (2): standard clock output mode.
   * EMAC\_CLK\_OUT\_180 (3): clock signal shifted by 180 degrees.
   * GPIO0\_IN/OUT (0, 1): external clock source modes.
3. **Pin configuration**
   * All GPIO pins must be valid ESP32 pins (0-39).
   * Avoid pins already used by other functions.
   * Some pins may be reserved on specific ESP32 modules.
4. **Reset behaviour**
   * When `phyrst` is set to -1, software reset is used.
   * Hardware reset through `phyrst` is more reliable, but requires an additional GPIO.
5. **Timing**
   * The system waits 10 ms after enabling PHY before continuing initialization.
   * Adjust `timeout` according to the PHY chip specifications.
   * Longer timeouts are more reliable, but increase boot time.

**Config examples**

**Standard LAN8720 config**:

```json
{
  "ethernet": {
    "phydet": 0,
    "phymdc": 23,
    "phymdio": 18,
    "phyen": 12,
    "phyrst": -1,
    "rmiimode": 2,
    "rmiipin": 0,
    "timeout": 1000
  }
}
```

**Olimex POE config**:

```json
{
  "ethernet": {
    "phydet": 0,
    "phymdc": 23,
    "phymdio": 18,
    "phyen": 12,
    "phyrst": -1,
    "rmiimode": 2,
    "rmiipin": 17,
    "timeout": 1000
  }
}
```

### Error codes

Possible error codes:

| Error code | Description | Possible solution |
| --- | --- | --- |
| 50768234 | Invalid Ethernet type | Check that the specified `type` is supported |
| 45553478 | Ethernet type is not a string | Make sure `type` is a string |
| 56927834 | IP address is not a string | Make sure `ip` is a string |
| 23074945 | Gateway IP address is not a string | Make sure `gateway` is a string |
| 26347089 | Netmask IP address is not a string | Make sure `mask` is a string |
| 62507839 | DNS IP address is not a string | Make sure `dns` is a string |
| 10435793 | Hostname is not a string | Make sure `hostname` is a string |
| 29683748 | Failed to create ESP32 Ethernet MAC | Check the hardware connection |
| 23498792 | Failed to create Ethernet PHY | Check the PHY configuration |
| 95273483 | Failed to install Ethernet driver | Check system resources |
| 15694378 | Failed to register Ethernet event handler | Check system resources |
| 31729483 | Failed to register IP event handler | Check system resources |
| 92657834 | Failed to attach Ethernet driver to the TCP/IP stack | Check system configuration |
| 23148734 | Failed to set network interface hostname | Check hostname validity |
| 69853473 | Failed to stop DHCP server | Check network configuration |
| 68239473 | Failed to stop DHCP client | Check network configuration |

### Warning codes

The Ethernet interface generates warning codes for the following events:

| Warning code | Description | Additional information |
| --- | --- | --- |
| 62537809 | Ethernet Link Up | Physical connection established |
| 59634873 | Ethernet Link Down | Physical connection lost |
| 95624383 | Ethernet Started | Interface initialized successfully |
| 62579839 | Ethernet Stopped | Interface stopped |
| 69278533 | Ethernet Got IP Address | IP configuration obtained |

When an IP address is obtained, the system logs information about IP, Gateway and Netmask.

#### Important notes

1. When using static IP configuration, all three parameters (`ip`, `gateway` and `mask`) must be provided.
2. The PHY Enable pin is set to HIGH during initialization.
3. The system waits 10 ms after enabling PHY before continuing initialization.
4. DHCP is used by default if no static IP configuration is provided.

***

:::note
**Did not find what you were looking for?**

[Tell us what is missing](https://bit.ly/4kQ0eax). We will use your feedback to improve the documentation.
:::
