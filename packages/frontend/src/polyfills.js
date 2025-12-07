import { Buffer } from 'buffer';
import process from 'process';

window.Buffer = Buffer;
window.process = process;

// Make Buffer global
global.Buffer = Buffer;
global.process = process;