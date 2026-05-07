import os

def get_tail(filename, lines=50000):
    bufsize = 1024 * 1024 # 1MB chunks
    fsize = os.stat(filename).st_size
    with open(filename, 'rb') as f:
        if fsize == 0: return []
        pos = fsize
        data = []
        lines_found = 0
        while pos > 0 and lines_found <= lines:
            seek_pos = max(0, pos - bufsize)
            f.seek(seek_pos)
            chunk = f.read(pos - seek_pos)
            lines_found += chunk.count(b'\n')
            data.insert(0, chunk)
            pos = seek_pos
        
        all_data = b''.join(data)
        return all_data.splitlines()[-lines:]

def create_lite(src, dest, lines=50000):
    print(f"Reading header from {src}...")
    with open(src, 'r', encoding='utf-8', errors='ignore') as f:
        header = f.readline()
    
    print(f"Reading last {lines} lines...")
    tail_lines = get_tail(src, lines)
    
    print(f"Writing {len(tail_lines)} lines to {dest}...")
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(header)
        for line in tail_lines:
            try:
                f.write(line.decode('utf-8') + '\n')
            except:
                continue
    print("Done!")

if __name__ == "__main__":
    create_lite('data/raw/scada_generation.csv', 'data/raw/scada_lite.csv')
