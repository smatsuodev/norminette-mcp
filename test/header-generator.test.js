import { describe, it } from 'mocha';
import { expect } from 'chai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generate42Header,
  has42Header,
  extractHeaderInfo,
  update42Header
} from '../dist/header-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('42 Header Generator', () => {
  describe('generate42Header', () => {
    it('should generate a valid 42 header', async () => {
      const testFile = path.join(__dirname, 'test.c');
      const header = await generate42Header(testFile);
      
      // Check basic structure
      const lines = header.split('\n');
      expect(lines).to.have.lengthOf(12); // 11 header lines + 1 empty line
      
      // Check borders
      expect(lines[0]).to.equal('/* ************************************************************************** */');
      expect(lines[10]).to.equal('/* ************************************************************************** */');
      
      // Check filename line
      expect(lines[3]).to.include('test.c');
      expect(lines[3]).to.match(/:\+:\s+:\+:\s+:\+:\s+\*\/$/);
      
      // Check author line
      expect(lines[5]).to.match(/^\/\*\s+By: .+ <.+@.+>\s+.+\*\/$/);
      
      // Check created/updated lines
      expect(lines[7]).to.match(/^\/\*\s+Created: \d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} by .+\s+.+\*\/$/);
      expect(lines[8]).to.match(/^\/\*\s+Updated: \d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2} by .+\s+.+\*\/$/);
    });
    
    it('should handle long filenames correctly', async () => {
      const longFilename = 'this_is_a_very_long_filename_that_might_cause_issues.c';
      const testFile = path.join(__dirname, longFilename);
      const header = await generate42Header(testFile);
      
      const lines = header.split('\n');
      expect(lines[3]).to.include(longFilename);
      expect(lines[3]).to.have.lengthOf(80); // Must be exactly 80 chars
    });
  });
  
  describe('has42Header', () => {
    it('should detect valid 42 header', () => {
      const validHeader = `/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   test.c                                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: user <user@student.42.fr>                  +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2024/01/01 00:00:00 by user              #+#    #+#             */
/*   Updated: 2024/01/01 00:00:00 by user             ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

int main(void) { return 0; }`;
      
      expect(has42Header(validHeader)).to.be.true;
    });
    
    it('should reject invalid headers', () => {
      const invalidHeaders = [
        '', // Empty
        '/* Invalid header */',
        '/* ************************************************************************** */', // Just border
        `/* Wrong border */
/*                                                                            */
/*                                                        :::      ::::::::   */`,
      ];
      
      for (const header of invalidHeaders) {
        expect(has42Header(header)).to.be.false;
      }
    });
  });
  
  describe('extractHeaderInfo', () => {
    it('should extract header information correctly', () => {
      const validHeader = `/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   test.c                                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: testuser <testuser@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2024/01/01 12:00:00 by testuser          #+#    #+#             */
/*   Updated: 2024/01/02 13:00:00 by otheruser        ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */`;
      
      const info = extractHeaderInfo(validHeader);
      expect(info).to.not.be.null;
      expect(info.filename).to.equal('test.c');
      expect(info.username).to.equal('testuser');
      expect(info.email).to.equal('testuser@student.42.fr');
      expect(info.createdDate).to.equal('2024/01/01 12:00:00');
      expect(info.createdBy).to.equal('testuser');
      expect(info.updatedDate).to.equal('2024/01/02 13:00:00');
      expect(info.updatedBy).to.equal('otheruser');
    });
  });
  
  describe('update42Header', () => {
    it('should update existing header while preserving creation info', async () => {
      const originalHeader = `/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   test.c                                             :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: original <original@student.42.fr>          +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2024/01/01 12:00:00 by original          #+#    #+#             */
/*   Updated: 2024/01/01 12:00:00 by original         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

int main(void) { return 0; }`;
      
      const testFile = path.join(__dirname, 'test.c');
      const updated = await update42Header(originalHeader, testFile);
      const lines = updated.split('\n');
      
      // Should preserve creation info
      expect(lines[7]).to.include('2024/01/01 12:00:00 by original');
      
      // Should update the updated line
      expect(lines[8]).to.not.include('2024/01/01 12:00:00');
      expect(lines[8]).to.match(/Updated: \d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}/);
    });
  });
});