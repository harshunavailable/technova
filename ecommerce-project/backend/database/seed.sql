/* ============================================================
   TECHNOVA — Seed Data
   Sample categories, products and one admin user.
   Run AFTER schema.sql
   ============================================================ */

/* ---- Categories ---- */
INSERT INTO Categories (Name, SectionType, SlotType, IconClass) VALUES
('Processor',        'PC',   'cpu',         'cpu'),
('Motherboard',       'PC',   'motherboard', 'board'),
('RAM',               'PC',   'ram',         'ram'),
('Graphics Card',     'PC',   'gpu',         'gpu'),
('Storage',           'PC',   'storage',     'storage'),
('Power Supply',      'PC',   'psu',         'psu'),
('Cabinet',           'PC',   'cabinet',     'cabinet'),
('Monitor',           'PC',   'monitor',     'monitor'),
('CCTV Camera',       'CCTV', NULL,          'camera'),
('DVR / NVR',         'CCTV', NULL,          'dvr'),
('Cables & Connectors','CCTV', NULL,         'cable'),
('Security Accessories','CCTV', NULL,        'shield');
GO

/* ---- Sample Admin (password = Admin@123, bcrypt-hashed at app startup — placeholder hash below) ---- */
-- NOTE: replace PasswordHash by running backend/utils/hashPassword.js and pasting the result,
-- or simply register normally through the site and promote the row to Role='admin'.
INSERT INTO Users (FullName, Email, PasswordHash, Role) VALUES
('Store Admin', 'admin@technova.com', '$2b$10$replaceWithRealBcryptHashAtSetup', 'admin');
GO

/* ---- PC Components ---- */
INSERT INTO Products (CategoryID, Name, Brand, Description, Price, Stock, ImageURL, SpecsJSON, Socket, RamType, FormFactor, WattageNeeded, WattageSupplied) VALUES
(1,'Ryzen 5 7600X','AMD','6-core / 12-thread desktop processor built for fast, fluid gaming and creation.',24999,35,'cpu-ryzen5.jpg','{"Cores":"6","Threads":"12","Base Clock":"4.7GHz"}','AM5',NULL,NULL,NULL,NULL),
(1,'Core i5-14400F','Intel','10-core hybrid processor delivering strong everyday and gaming performance.',19999,40,'cpu-intel-i5.jpg','{"Cores":"10","Threads":"16","Base Clock":"2.5GHz"}','LGA1700',NULL,NULL,NULL,NULL),
(1,'Ryzen 7 7800X3D','AMD','Gaming-first 8-core CPU with 3D V-Cache for class-leading frame rates.',42999,20,'cpu-ryzen7.jpg','{"Cores":"8","Threads":"16","Cache":"96MB"}','AM5',NULL,NULL,NULL,NULL),

(2,'B650 Aorus Elite','Gigabyte','ATX motherboard with PCIe 4.0, DDR5 support and robust power delivery.',15999,25,'mobo-b650.jpg','{"Chipset":"B650","M.2 Slots":"2"}','AM5','DDR5','ATX',NULL,NULL),
(2,'B760M Pro RS','ASRock','Reliable micro-ATX board for 12th/13th/14th-gen Intel builds.',10999,30,'mobo-b760m.jpg','{"Chipset":"B760","M.2 Slots":"2"}','LGA1700','DDR4','mATX',NULL,NULL),
(2,'X670E Taichi','ASRock','Premium ATX flagship board for high-end AM5 builds.',34999,10,'mobo-x670e.jpg','{"Chipset":"X670E","M.2 Slots":"4"}','AM5','DDR5','ATX',NULL,NULL),

(3,'Vengeance 16GB DDR5 6000MHz','Corsair','Low-latency high-speed DDR5 kit tuned for AMD & Intel platforms.',5499,60,'ram-corsair-ddr5.jpg','{"Capacity":"16GB (2x8GB)","Speed":"6000MHz"}',NULL,'DDR5',NULL,NULL,NULL),
(3,'Fury Beast 16GB DDR4 3200MHz','Kingston','Reliable, plug-and-play DDR4 memory for mainstream builds.',3299,80,'ram-kingston-ddr4.jpg','{"Capacity":"16GB (2x8GB)","Speed":"3200MHz"}',NULL,'DDR4',NULL,NULL,NULL),

(4,'RTX 4060 Ti 8GB','NVIDIA / ASUS','1440p-ready ray-tracing GPU with DLSS 3 frame generation.',42999,15,'gpu-4060ti.jpg','{"VRAM":"8GB","Bus":"128-bit"}',NULL,NULL,NULL,550,NULL),
(4,'RX 7700 XT 12GB','AMD / Sapphire','High-VRAM 1440p graphics card built for modern AAA titles.',44999,12,'gpu-7700xt.jpg','{"VRAM":"12GB","Bus":"192-bit"}',NULL,NULL,NULL,650,NULL),
(4,'RTX 4070 Super 12GB','NVIDIA / MSI','Excellent 1440p/4K performance with efficient power draw.',59999,8,'gpu-4070super.jpg','{"VRAM":"12GB","Bus":"192-bit"}',NULL,NULL,NULL,650,NULL),

(5,'980 Pro 1TB NVMe','Samsung','Blazing-fast PCIe 4.0 SSD for near-instant load times.',7999,50,'ssd-980pro.jpg','{"Capacity":"1TB","Interface":"PCIe 4.0"}',NULL,NULL,NULL,NULL,NULL),
(5,'Barracuda 2TB HDD','Seagate','High-capacity storage for media, games and backups.',4499,45,'hdd-barracuda.jpg','{"Capacity":"2TB","RPM":"7200"}',NULL,NULL,NULL,NULL,NULL),

(6,'RM750 750W 80+ Gold','Corsair','Fully modular, whisper-quiet PSU with 10-year warranty.',8999,30,'psu-rm750.jpg','{"Wattage":"750W","Efficiency":"80+ Gold"}',NULL,NULL,NULL,NULL,750),
(6,'MWE 550 White V2','Cooler Master','Budget-friendly, non-modular reliable power supply.',3999,40,'psu-mwe550.jpg','{"Wattage":"550W","Efficiency":"80+ White"}',NULL,NULL,NULL,NULL,550),

(7,'4000D Airflow','Corsair','Mid-tower ATX case with high-airflow front mesh.',7999,25,'case-4000d.jpg','{"Supports":"ATX, mATX, ITX"}',NULL,NULL,'ATX',NULL,NULL),
(7,'NR200P Mini-ITX','Cooler Master','Compact mini-ITX case for small-form-factor builds.',8999,15,'case-nr200p.jpg','{"Supports":"ITX only"}',NULL,NULL,'ITX',NULL,NULL),

(8,'27" QHD 165Hz IPS','LG','Fast, color-accurate monitor built for gaming and creative work.',22999,20,'monitor-27qhd.jpg','{"Resolution":"2560x1440","Refresh":"165Hz"}',NULL,NULL,NULL,NULL,NULL);
GO

/* ---- CCTV Products ---- */
INSERT INTO Products (CategoryID, Name, Brand, Description, Price, Stock, ImageURL, SpecsJSON) VALUES
(9,'4MP Dome Camera (Indoor)','Hikvision','Sharp indoor dome camera with night vision up to 30m.',2499,60,'cctv-dome-indoor.jpg','{"Resolution":"4MP","Night Vision":"30m"}'),
(9,'5MP Bullet Camera (Outdoor)','CP Plus','Weatherproof outdoor bullet camera with IP67 rating.',3199,55,'cctv-bullet-outdoor.jpg','{"Resolution":"5MP","Rating":"IP67"}'),
(9,'360° PTZ WiFi Camera','TP-Link Tapo','Pan-tilt smart camera with motion tracking and two-way audio.',3999,40,'cctv-ptz-wifi.jpg','{"Resolution":"3MP","Feature":"360° Pan/Tilt"}'),
(10,'8-Channel NVR (No PoE)','Hikvision','Supports up to 8 IP cameras with 4K playback.',7999,20,'nvr-8ch.jpg','{"Channels":"8","Max Res":"4K"}'),
(10,'4-Channel DVR + 1TB HDD','CP Plus','Complete recording kit bundled with hard drive.',6499,25,'dvr-4ch.jpg','{"Channels":"4","Storage":"1TB included"}'),
(11,'Cat6 Cable (90m box)','D-Link','Pure copper networking cable for stable camera feeds.',1899,70,'cable-cat6.jpg','{"Length":"90m","Type":"Cat6"}'),
(11,'BNC + Power Combo Cable (20m)','Generic','Ready-to-use coaxial cable for analog CCTV setups.',799,90,'cable-bnc.jpg','{"Length":"20m"}'),
(12,'12V 10A SMPS Power Box','Generic','9-channel distributed power supply for camera arrays.',1499,35,'accessory-smps.jpg','{"Output":"12V 10A","Channels":"9"}'),
(12,'2TB Surveillance HDD','WD Purple','Purpose-built hard drive rated for 24x7 recording.',5499,30,'accessory-wdpurple.jpg','{"Capacity":"2TB","Duty":"24x7"}');
GO

PRINT 'Seed data inserted successfully.';
