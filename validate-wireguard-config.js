#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function validateWireGuardConfig(configPath = '/etc/wireguard/wg0.conf') {
  try {
    console.log(`🔍 Validating WireGuard configuration: ${configPath}`);
    
    const configContent = await fs.readFile(configPath, 'utf8');
    const lines = configContent.split('\n');
    
    let errors = [];
    let warnings = [];
    let peerCount = 0;
    let inPeerSection = false;
    let currentPeerHasPublicKey = false;
    let currentPeerNumber = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;
      
      // Skip empty lines and comments
      if (line === '' || line.startsWith('#')) continue;
      
      if (line.startsWith('[Interface]')) {
        if (inPeerSection && !currentPeerHasPublicKey) {
          errors.push(`Line ${lineNumber}: Peer #${currentPeerNumber} is missing PublicKey`);
        }
        inPeerSection = false;
      } else if (line.startsWith('[Peer]')) {
        if (inPeerSection && !currentPeerHasPublicKey) {
          errors.push(`Line ${lineNumber}: Previous Peer #${currentPeerNumber} is missing PublicKey`);
        }
        inPeerSection = true;
        currentPeerNumber++;
        currentPeerHasPublicKey = false;
        peerCount++;
      } else if (inPeerSection) {
        if (line.startsWith('PublicKey =')) {
          const publicKey = line.split('=')[1]?.trim();
          if (!publicKey || publicKey.length === 0) {
            errors.push(`Line ${lineNumber}: PublicKey is empty`);
          } else if (publicKey.length !== 44) {
            warnings.push(`Line ${lineNumber}: PublicKey length is ${publicKey.length}, expected 44 characters`);
          } else {
            currentPeerHasPublicKey = true;
          }
        } else if (line.startsWith('AllowedIPs =')) {
          const allowedIPs = line.split('=')[1]?.trim();
          if (!allowedIPs || allowedIPs.length === 0) {
            warnings.push(`Line ${lineNumber}: AllowedIPs is empty`);
          }
        }
      }
    }
    
    // Check the last peer section
    if (inPeerSection && !currentPeerHasPublicKey) {
      errors.push(`End of file: Final Peer #${currentPeerNumber} is missing PublicKey`);
    }
    
    // Display results
    console.log(`\n📊 Configuration Summary:`);
    console.log(`   Total peers: ${peerCount}`);
    console.log(`   Errors: ${errors.length}`);
    console.log(`   Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log(`\n❌ Errors found:`);
      errors.forEach(error => console.log(`   ${error}`));
    }
    
    if (warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      console.log(`\n✅ Configuration is valid!`);
    } else if (errors.length === 0) {
      console.log(`\n✅ Configuration is valid (with warnings)`);
    } else {
      console.log(`\n❌ Configuration has errors that need to be fixed`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`❌ Failed to validate configuration: ${error.message}`);
    process.exit(1);
  }
}

// Get config path from command line argument or use default
const configPath = process.argv[2] || '/etc/wireguard/wg0.conf';
validateWireGuardConfig(configPath);
