# Syntrix V2X: A Software-Defined Cloud-Synchronized Vehicle-to-Everything System with C-V2X Resource Allocation Analysis

## Abstract
Urban emergency vehicle delays at congested intersections directly impact survival rates in critical incidents. Traditional hardware-based Cellular Vehicle-to-Everything (C-V2X) systems require high-cost On-Board Units (OBUs) and Roadside Units (RSUs), hindering wide-scale deployment in resource-constrained municipalities. This paper presents *Syntrix V2X*, a software-defined, cloud-synchronized emergency clearance system that leverages browser-based Geolocation APIs, WebSocket-based synchronization via Firebase, and a dual-stage state estimation pipeline (Kalman and Particle filtering) to achieve real-time Vehicle-to-Vehicle (V2V) yield alerts and Vehicle-to-Infrastructure (V2I) traffic signal preemption. Crucially, we present a detailed analysis of C-V2X Sidelink Resource Allocation (RA) modes, comparing LTE-V2X (Mode 3 and Mode 4) with 5G-NR V2X (Mode 1 and Mode 2), and mapping our software-defined broker architecture onto these standardized radio layers. We outline practical integration pathways for physical vehicle dashboards (using Android Auto, Apple CarPlay, and OBD-II telematics) and address the deployment challenge for vehicles lacking visual dashboards by proposing alternative interaction paradigms, including windshield-projected Head-Up Displays (HUDs), haptic wearable alerts, and localized acoustic-beacon receivers.

**Keywords—Cellular Vehicle-to-Everything (C-V2X), Resource Allocation Modes, LTE-V2X, NR-V2X, Sidelink PC5, Kalman Filter, Infotainment Integration.**

---

## I. Introduction
In densely populated metropolitan areas, emergency vehicles (EVs) such as ambulances, fire engines, and police patrol units routinely experience delays due to heavy traffic congestion. According to traffic safety telemetry, delays in emergency medical response times correlate non-linearly with mortality rates in trauma and cardiac events. Current methods of clearing lanes rely primarily on acoustic sirens and visual strobe lights. These systems are passive, localized, and heavily dependent on the reaction of civilian drivers, which is often compromised in modern sound-insulated passenger vehicles.

Cellular Vehicle-to-Everything (C-V2X) communication, operating on the Sidelink PC5 direct interface, offers a cooperative solution by allowing real-time state sharing between emergency vehicles, traffic signals, and civilian road users. However, standardizing C-V2X direct radio communication faces high barrier costs due to the need for specialized radio hardware. This capital intensity delays the benefits of intelligent transportation systems in developing nations.

To bridge this gap, this paper introduces *Syntrix V2X*, a software-defined V2X system that runs on standard browser environments, using persistent WebSockets over Firebase Realtime Database for low-latency synchronization. We address positional accuracy concerns with a dual-stage filtering pipeline and solve the real-world deployment challenge by designing multi-tier vehicle integration strategies. Furthermore, we analyze how our centralized database broker models the resource scheduling mechanisms defined in the C-V2X standards, bridging the gap between cloud-based and direct sidelink architectures. The primary contributions of this work are:
1. The design of a zero-hardware-cost, event-driven V2X communication pipeline achieving sub-500ms latency.
2. A dual-stage state estimation pipeline (Kalman Filter + Particle Filter) that stabilizes geolocation vectors in urban canyons.
3. A technical analysis of C-V2X Sidelink Resource Allocation (RA) modes from LTE-V2X (Modes 3/4) to 5G-NR V2X (Modes 1/2).
4. Alternative interaction designs (HUDs, haptics, acoustics) for civilian vehicles lacking integrated dashboard displays.

---

## II. Overview of Vehicular Communication Technologies
Vehicular networks rely on two competing technology families: Wi-Fi-based and Cellular-based. The Wi-Fi-based family includes the mature IEEE 802.11p standard (operating in the 5.9 GHz ITS band with a 10-MHz bandwidth and subcarrier spacing of 156.25 kHz) and its successor, IEEE 802.11bd, which introduces 256-QAM, MIMO, and midambles for channel estimation at speeds up to 500 km/h. 

The Cellular-based family (C-V2X), standardized by the 3GPP, encompasses two generations:
1. **LTE-V2X (Release 14/15):** Utilizes the PC5 sidelink interface for direct V2V and V2I communication, based on device-to-device (D2D) protocols. It employs SC-FDMA at the MAC layer and turbo coding, with a fixed 15 kHz subcarrier spacing (SCS).
2. **5G-NR V2X (Release 16+):** Designed for advanced use cases (vehicle platooning, extended sensors, remote driving) requiring high reliability (>99.999%) and low latency (<3 ms). It introduces flexible numerologies (SCS of 15, 30, 60, and 120 kHz), LDPC coding, and a Physical Sidelink Feedback Channel (PSFCH) supporting unicast and groupcast modes in addition to broadcast.

Coexistence between these technologies remains a challenge. Inter-technology coexistence in the 5.9 GHz band is managed via frequency division (e.g., the 5GAA model dedicating 10-MHz channels to each, combined with detect-and-vacate [DAV] or detect-and-mitigate [DAM] protocols). Intra-technology coexistence between LTE-V2X and NR-V2X is managed via Frequency Division Multiplexing (FDM, splitting transmission power across channels) or Time Division Multiplexing (TDM, scheduling transmissions orthogonally in time).

---

## III. C-V2X Sidelink Resource Allocation Modes

Sidelink Resource Allocation (RA) determines how vehicles reserve and access physical radio resources (Subchannel resource blocks in time and frequency domains) on the PC5 interface. C-V2X defines centralized (network-managed) and distributed (autonomous) modes.

```
       +-------------------------------------------------------+
       |           C-V2X Sidelink Resource Allocation          |
       +---------------------------+---------------------------+
                                   |
               +-------------------+-------------------+
               |                                       |
               v (Centralized)                         v (Distributed)
  +------------+------------+             +------------+------------+
  |    Under-Coverage       |             |    Out-of-Coverage      |
  |  - LTE-V2X: Mode 3      |             |  - LTE-V2X: Mode 4      |
  |  - 5G-NR:   Mode 1      |             |  - 5G-NR:   Mode 2      |
  +-------------------------+             +-------------------------+
```

### A. LTE-V2X Resource Allocation (Mode 3 vs. Mode 4)

1. **Mode 3 (Centralized Scheduling):** Operates under cellular coverage where the evolved Node B (eNB) manages and allocates resources. Scheduling is executed via two schemes:
   * **Dynamic Allocation:** The vehicle requests subchannels via the Physical Uplink Control Channel (PUCCH) for each transmission, generating higher signaling overhead and latency.
   * **Semi-Persistent Scheduling (SPS):** The eNB reserves subchannels for periodic transmissions (e.g., Cooperative Awareness Messages, CAMs) based on vehicle-reported assistance information (packet size, periodicity, priority). The eNB can configure up to 8 active SPS configurations.

2. **Mode 4 (Distributed Autonomous Scheduling):** Operates without network assistance. Vehicles autonomously select resources using a sensing-based SPS algorithm:
   * **Sensing Window:** The vehicle monitors channel energy (RSRP and RSSI) over a sliding window of the last 1,000 subframes (1 second) to identify resource reservations advertised in Sidelink Control Information (SCI) fields by neighboring UEs.
   * **Selection Window:** When a packet arrives at time $T$, the vehicle defines a selection window $[T+T_1, T+T_2]$, where $1 \le T_1 \le 4$ subframes (processing delay) and $20 \le T_2 \le 100$ subframes (latency budget).
   * **Filtering (List $L_1$ and $L_2$):** The vehicle generates List $L_1$ by excluding resources whose RSRP exceeds a threshold $Th$. $L_1$ must contain at least 20% of the selection window resources; otherwise, $Th$ is incremented by 3 dB. List $L_2$ is formed by selecting the 20% of resources in $L_1$ with the lowest RSSI values. The vehicle randomly selects its final resource from $L_2$.
   * **Reselection Counter:** The chosen resource is reserved for a random counter interval (e.g., [5-15] for 10 Hz traffic) and decremented per transmission. Upon reaching zero, the resource is reselected with probability $1-P$ (where $P \approx 0-0.8$ is the keep probability).
   * **Congestion Control:** Managed via Channel Busy Ratio (CBR, fraction of subchannels with RSSI above a threshold) and Channel Occupancy Ratio (CR, fraction of subchannels occupied or reserved). UEs must reduce their CR (by altering MCS or dropping packets) if it exceeds a standardized $CR_{Limit}$ corresponding to the measured CBR.

### B. 5G-NR V2X Resource Allocation (Mode 1 vs. Mode 2)

1. **Mode 1 (Centralized Scheduling):** The gNB schedules sidelink resources using either:
   * **Dynamic Grant (DG):** The vehicle requests resources via PUCCH, and the gNB responds with Downlink Control Information (DCI) on the Physical Downlink Control Channel (PDCCH) indicating the allocated subchannels. The vehicle broadcasts this assignment in its SCI, notifying nearby Mode 2 vehicles to prevent collisions.
   * **Configured Grant (CG):** Similar to LTE Mode 3 SPS but more flexible. *Type 1 CG* is configured directly via Radio Resource Control (RRC) signaling. *Type 2 CG* is RRC-configured but dynamically activated/deactivated via DCI.

2. **Mode 2 (Distributed Autonomous Scheduling):** Vehicles autonomously select resources from pre-configured pools. To accommodate both periodic and aperiodic traffic, NR-V2X introduces:
   * **Long-Term Sensing:** Similar to LTE Mode 4 sensing-based SPS, optimized for periodic safety traffic.
   * **Short-Term Sensing:** A Listen-Before-Talk (LBT) mechanism that senses the medium prior to transmission, designed for highly dynamic, non-periodic traffic such as Decentralized Environmental Notification Messages (DENMs).
   * **Hybrid Sensing:** Combines both, using long-term sensing to build a candidate resource set and short-term sensing as a final collision avoidance check.
   * **Sidelink Submodes:**
     * **Submode 2a:** Standard autonomous resource selection (legacy Mode 2).
     * **Submode 2b (Inter-UE Coordination):** A UE assists another UE's resource selection by transmitting assistance information (sets of preferred or non-preferred resources based on its own sensing, location, or RSRP).
     * **Submode 2d (Group Scheduling):** A Scheduling UE (S-UE) acts as a local coordinator, dynamically allocating resources for a group of vehicles (e.g., within a vehicle platoon), which reduces latency and collision probabilities within the cluster.

---

## IV. Syntrix V2X System Design and Mathematical Modeling

The Syntrix V2X system maps these radio scheduling concepts onto an application-layer cloud broker (Firebase). In this model, Firebase acts as a centralized database scheduler similar to Mode 3 / Mode 1 centralized grants, while client-side calculations represent the autonomous decision logic of Mode 4 / Mode 2.

### A. Geolocation Pre-processing (Dual-Stage Filtering)

Let the raw coordinates received from the browser's Geolocation API at time $t$ be $z_t = [lat_{raw}, lon_{raw}]^T$.

1. **Stage 1 (Kalman Filter):** We define the state vector as $x_t = [pos_t, vel_t]^T$ for latitude and longitude independently. The state transition and measurement equations are:
   $$x_t = A x_{t-1} + w_t, \quad w_t \sim \mathcal{N}(0, Q)$$
   $$z_t = H x_t + v_t, \quad v_t \sim \mathcal{N}(0, R)$$
   Where $Q$ represents process noise and $R$ represents measurement noise. The correction step updates the state estimate $\hat{x}_t$ and error covariance $P_t$ using the Kalman Gain $K_t$:
   $$K_t = P_t^- H^T (H P_t^- H^T + R)^{-1}$$
   $$\hat{x}_t = \hat{x}_t^- + K_t (z_t - H \hat{x}_t^-)$$
   $$P_t = (I - K_t H) P_t^-$$

2. **Stage 2 (Particle Filter):** The output of the Kalman filter $\hat{x}_{t}$ is fed into a localized Particle Filter with $N = 100$ particles $\{x_t^{(i)}\}_{i=1}^N$. Each particle represents a candidate coordinate. When a new GPS update arrives, the particles propagate based on a random-walk motion model. The weights $w_t^{(i)}$ of the particles are updated using a Gaussian likelihood function relative to the Kalman position:
   $$w_t^{(i)} \propto \exp\left(-\frac{\|\hat{x}_t - x_t^{(i)}\|^2}{2\sigma^2}\right)$$
   Particles are resampled using systematic resampling when the effective particle size $N_{eff} < N/2$. The final coordinate $X_t$ is the weighted mean of the resampled particles.

### B. Proximity and Bearing Metrics
Let $X_{EV} = (lat_{EV}, lon_{EV})$ and $X_{Civ} = (lat_{Civ}, lon_{Civ})$ be the filtered coordinates of the emergency and civilian vehicles.

1. **Distance Computation:** We compute the great-circle distance $d$ using the Haversine formula:
   $$\Delta lat = lat_{Civ} - lat_{EV}, \quad \Delta lon = lon_{Civ} - lon_{EV}$$
   $$a = \sin^2\left(\frac{\Delta lat}{2}\right) + \cos(lat_{EV})\cos(lat_{Civ})\sin^2\left(\frac{\Delta lon}{2}\right)$$
   $$d = 2 R_e \arcsin\left(\sqrt{a}\right)$$
   Where $R_e \approx 6371$ km.

2. **Bearing Analysis:** The absolute bearing $\theta$ from the EV to the civilian vehicle is calculated as:
   $$\theta = \operatorname{atan2}\left(\sin(\Delta lon)\cos(lat_{Civ}), \cos(lat_{EV})\sin(lat_{Civ}) - \sin(lat_{EV})\cos(lat_{Civ})\cos(\Delta lon)\right)$$

3. **Relative Bearing ($\theta_{rel}$):** Let $\psi$ be the EV's heading vector (in degrees clockwise from North). The relative bearing is:
   $$\theta_{rel} = (\theta - \psi + 360^\circ) \pmod{360^\circ}$$
   The yield logic evaluates $\theta_{rel}$:
   * If $\theta_{rel} \in [0^\circ, 180^\circ]$: The civilian vehicle is to the right of the EV's heading axis, triggering a **"MOVE RIGHT"** advisory.
   * If $\theta_{rel} \in (180^\circ, 360^\circ)$: The civilian vehicle is to the left, triggering a **"MOVE LEFT"** advisory.

---

## V. Real-World Vehicle Integration & Deployment Strategies

To transition Syntrix V2X from a browser prototype to a real-world system, we present a deployment framework for standard vehicles and vehicles without digital dashboards.

### A. Vehicles Equipped with Digital Dashboards
Modern passenger vehicles feature central infotainment screens. Syntrix V2X integrates with these systems through three main mechanisms:

1. **Android Auto and Apple CarPlay Custom Apps:**
   The Web-based client is packaged into a native application container using Apache Cordova or Capacitor. By implementing the Android for Cars App Library and Apple CarPlay App Templates, the V2X alert interface is mirrored onto the center console screen. During an alert, the system uses the template UI to override active navigation screens with high-contrast yield instructions (arrows and text).

2. **CAN-Bus and OBD-II Telematics Integration:**
   Through an OBD-II dongle connected via Bluetooth or Wi-Fi, the V2X application reads real-time velocity and steering data directly from the vehicle's Controller Area Network (CAN-Bus). This data supplements browser GPS variables, increasing the accuracy of relative movement calculations.

3. **Audio Preemption via Infotainment Systems:**
   By utilizing the native platform's audio manager, the application requests exclusive audio focus during an alert. It pauses active media (radio, streaming music) and plays a localized synthetic siren sound alongside text-to-speech yield advisories (e.g., "Warning: Emergency Vehicle approaching behind you. Please yield to the left").

### B. Vehicles Without Built-in Digital Dashboards
A significant challenge in developing countries is the high volume of older passenger cars, commercial vehicles, and two-wheelers (motorcycles, scooters) that lack digital infotainment screens. To address this, we propose four alternative interfaces:

1. **Windshield Head-Up Display (HUD) Retrofits:**
   Users can install low-cost, aftermarket HUD projection devices (glass reflectors mounted on the dashboard above the steering column). The smartphone V2X application operates in a "HUD Mirror Mode," displaying inverted high-contrast warning elements on the screen. Reflected onto the windshield, these elements show yield arrows directly in the driver's line of sight without blocking their view.

2. **Smartphone Mount System (Optimized UI):**
   Given the high rate of smartphone usage for navigation (e.g., on dashboard mounts), the V2X interface runs as a background service or a floating overlay widget (picture-in-picture mode) over standard navigation apps. The UI is simplified to a single color-changing border and a large directional arrow.

3. **Haptic Wearable Feedback (Two-Wheelers):**
   Motorcycle riders face high ambient wind noise, rendering acoustic alerts ineffective. For these users, the V2X application connects via Bluetooth to haptic actuators installed in the handlebar grips or embedded inside the rider's helmet. Left-side vibration indicates a **"MOVE LEFT"** action, right-side vibration indicates a **"MOVE RIGHT"** action, and alternating rapid pulses signify an immediate, close-range proximity warning.

4. **Bluetooth Acoustic Beacons and External Indicators:**
   Older vehicles can utilize a low-cost Bluetooth-to-FM transmitter plugged into the cigarette lighter socket. The V2X app streams alerts as an audio signal over a pre-tuned FM radio frequency. Alternatively, a small, dashboard-mounted LED indicator strip connected via Bluetooth can light up (Red/Blue flash) and point left or right to guide the driver.

---

## VI. Experimental Evaluation and Latency Analysis

### A. Geolocation Accuracy and Noise Reduction
To evaluate the dual-stage filtering pipeline, field tests were conducted in urban canyons where raw GPS signals exhibited multipath reflections. The dual-stage pipeline reduced coordinate variance from $\sigma^2_{raw} = 42.6 \text{ m}^2$ to $\sigma^2_{filtered} = 1.8 \text{ m}^2$. In static tests under tall structures, the maximum error spike dropped from 35 meters (raw GPS) to less than 4 meters (filtered output), stabilizing the distance-based alert triggers.

### B. Network and Preemption Latency
We measured the end-to-end latency from the moment the EV node writes its coordinate update to the database to the moment the civilian node renders the yield alert. Over a 4G/LTE cellular network, the average round-trip latency was **320 ms**, with a 95th percentile latency of **460 ms**.

The traffic signal preemption transition was evaluated on a simulated controller node. The average latency from when the EV entered the preemption range to when the light transitioned to green was **1.4 seconds**. This response time is sufficient to establish green corridors at typical vehicle speeds (40–60 km/h) when the preemption range is configured to 150–200 meters.

---

## VII. Limitations and Future Scope
1. **Network Dependency:** The system relies on cellular data connections. In regions with poor cellular coverage, the system cannot synchronize. Future revisions could integrate hybrid ad-hoc networks (Wi-Fi Direct or Bluetooth mesh) as localized fallback channels.
2. **Background Browser Execution:** Mobile operating systems restrict background GPS tracking in web browsers to save battery. To run reliably in the background, the application must be deployed as a native hybrid app.
3. **Multi-Vehicle Prioritization:** When multiple emergency vehicles approach the same intersection from conflicting directions, the signal preemption logic requires priority-based conflict resolution. Future work will investigate dynamic scheduling algorithms to manage these scenarios.

---

## VIII. Conclusion
This paper presented *Syntrix V2X*, a software-defined, low-cost Vehicle-to-Everything system designed to provide emergency vehicle clearance. By utilizing browser-based APIs, a dual-stage filtering pipeline, and Firebase synchronization, the system provides real-time V2V yield alerts and V2I signal preemption without requiring dedicated radio hardware. We analysed standard C-V2X resource allocation modes (LTE Modes 3/4 and 5G-NR Modes 1/2) and outlined integration strategies for both digital vehicle dashboards and older vehicles lacking digital screens. The results demonstrate that software-defined architectures can achieve the latencies and positional stability necessary to improve emergency vehicle response times in modern urban environments.

---

## References
1. X. Qin and A. M. Khan, "GPS-Based Emergency Vehicle Preemption System," *Transportation Research Record*, vol. 2324, pp. 105–112, 2012.
2. H. Noori, C. Olaverri-Monreal, and S. Selpi, "Connected Vehicle Approach for Emergency Vehicle Preemption," in *Proc. IEEE Int. Conf. Vehicular Electronics and Safety*, 2016, pp. 1–6.
3. R. Sharma and A. Gupta, "Cloud-Based V2X Communication for Developing Countries," *Int. J. Advanced Research in Computer Science*, vol. 10, no. 3, pp. 45–52, 2019.
4. R. E. Kálmán, "A New Approach to Linear Filtering and Prediction Problems," *Journal of Basic Engineering*, vol. 82, no. 1, pp. 35–45, 1960.
5. Google LLC, "Firebase Realtime Database Documentation," 2023. [Online]. Available: https://firebase.google.com/docs/database
6. Leaflet, "Leaflet: An Open-Source JavaScript Library for Interactive Maps," 2023. [Online]. Available: https://leafletjs.com
7. OSRM Project, "Open Source Routing Machine," 2023. [Online]. Available: https://project-osrm.org
8. IEEE Standards Association, "IEEE Standard for Wireless Access in Vehicular Environments (WAVE)," IEEE Std 802.11p-2010, 2010.
9. 3GPP, "Technical Specification Group Radio Access Network; Evolved Universal Terrestrial Radio Access (E-UTRA)," 3GPP TS 36.300, Release 14, 2017.
10. National Crime Records Bureau, "Accidental Deaths & Suicides in India (ADSI) - 2022," Ministry of Home Affairs, Govt. of India, 2023.
11. K. Sehla, T. M. T. Nguyen, G. Pujolle, and P. B. Velloso, "Resource Allocation Modes in C-V2X: From LTE-V2X to 5G-V2X," *IEEE Internet of Things Journal*, vol. 9, no. 11, pp. 8291-8314, June 1, 2022.
