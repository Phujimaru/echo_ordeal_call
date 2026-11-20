import subprocess, json, numpy as np

def load(path):
    info = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', path], capture_output=True, check=True).stdout)
    w, h = info['streams'][0]['width'], info['streams'][0]['height']
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(h, w, 4).copy()

def save(path, arr, webp=False):
    h, w = arr.shape[:2]
    args = ['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{w}x{h}', '-i', '-']
    if webp:
        args += ['-c:v', 'libwebp', '-lossless', '1', '-pix_fmt', 'yuva420p' if False else 'bgra']
    args += ['-frames:v', '1', path]
    subprocess.run(args, input=np.ascontiguousarray(arr).tobytes(), check=True)

def components(mask, min_px=1):
    """4-connected components via scipy-free BFS on downsampled runs; returns list of (y0,x0,y1,x1,count)."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32)
    out = []
    cur = 0
    ys, xs = np.nonzero(mask)
    for y, x in zip(ys, xs):
        if lab[y, x]:
            continue
        cur += 1
        stack = [(y, x)]
        lab[y, x] = cur
        y0 = y1 = y; x0 = x1 = x; n = 0
        while stack:
            cy, cx = stack.pop(); n += 1
            if cy < y0: y0 = cy
            if cy > y1: y1 = cy
            if cx < x0: x0 = cx
            if cx > x1: x1 = cx
            for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = cur; stack.append((ny, nx))
        if n >= min_px:
            out.append((y0, x0, y1 + 1, x1 + 1, n))
    return out
