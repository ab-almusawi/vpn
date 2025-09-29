#!/usr/bin/env node

const fs = require('fs').promises;

async function fixWireGuardConfig(configPath = '/etc/wireguard/wg0.conf') {
  try {
    console.log('🔧 Fixing WireGuard configuration...');
    
    const content = await fs.readFile(configPath, 'utf8');
    const lines = content.split('\n');
    
    const fixedLines = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      // Check if this is a peer section
      if (line.trim().startsWith('[Peer]')) {
        let peerSectionLines = [line];
        let j = i + 1;
        let hasValidPublicKey = false;
        
        // Collect all lines in this peer section
        while (j < lines.length && !lines[j].trim().startsWith('[')) {
          peerSectionLines.push(lines[j]);
          
          // Check if this peer section has a valid public key
          if (lines[j].trim().startsWith('PublicKey =')) {
            const publicKey = lines[j].split('=')[1]?.trim();
            if (publicKey && publicKey.length >= 43) {
              hasValidPublicKey = true;
            }
          }
          j++;
        }
        
        // Only keep peer sections with valid public keys
        if (hasValidPublicKey) {
          fixedLines.push(...peerSectionLines);
          console.log(`✅ Kept valid peer section`);
        } else {
          console.log(`🗑️  Removed invalid peer section (missing or invalid PublicKey)`);
        }
        
        i = j;
      } else {
        // This is not a peer section, keep the line
        fixedLines.push(line);
        i++;
      }
    }
    
    // Clean up trailing empty lines
    while (fixedLines.length > 0 && fixedLines[fixedLines.length - 1].trim() === '') {
      fixedLines.pop();
    }
    
    // Create backup
    const backupPath = `${configPath}.backup.${Date.now()}`;
    await fs.copyFile(configPath, backupPath);
    console.log(`📋 Created backup: ${backupPath}`);
    
    // Write fixed content
    const finalContent = fixedLines.join('\n') + (fixedLines.length > 0 ? '\n' : '');
    await fs.writeFile(configPath, finalContent);
    
    console.log('✅ WireGuard configuration fixed!');
    console.log('🔄 Restart WireGuard to apply changes:');
    console.log('   sudo systemctl restart wg-quick@wg0');
    
  } catch (error) {
    console.error('❌ Failed to fix configuration:', error.message);
    process.exit(1);
  }
}

// Get config path from command line argument or use default
const configPath = process.argv[2] || '/etc/wireguard/wg0.conf';
fixWireGuardConfig(configPath);
