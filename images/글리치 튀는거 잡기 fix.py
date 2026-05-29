import os
import tkinter as tk
from tkinter import filedialog, messagebox, ttk, colorchooser
from PIL import Image, ImageSequence
import collections # 대량 처리를 위한 큐(Queue) 지원

class AutoGIFBackgroundRemover:
    def __init__(self, root):
        self.root = root
        self.root.title("GIF 배경색만 자동 제거기 (Smart Background Remover)")
        self.root.geometry("550x500")

        # 기본 설정: 보통 문제가 되는 검정색(0,0,0)을 기본 배경색으로 세팅
        self.target_folder = ""
        self.bg_rgb = (0, 0, 0) # 제거할 배경색

        # ==========================================
        # UI 구성
        # ==========================================
        
        # 1. 안내 문구
        tk.Label(root, text="※ 캐릭터 내부는 보호하고, 연결된 바깥 배경색만 제거합니다.", 
                 font=("맑은 고딕", 10, "bold"), fg="#1976D2").pack(pady=(20, 5))
        tk.Label(root, text="(각 프레임의 모서리를 시작점으로 배경을 탐색합니다.)", 
                 font=("맑은 고딕", 9)).pack(pady=(0, 15))

        # 2. 폴더 선택 영역
        frame_path = tk.Frame(root)
        frame_path.pack(fill="x", padx=20)
        self.entry_path = tk.Entry(frame_path, width=40)
        self.entry_path.pack(side="left", expand=True, fill="x")
        btn_browse = tk.Button(frame_path, text="폴더 선택", command=self.browse_folder)
        btn_browse.pack(side="right", padx=(5, 0))

        # 3. 설정 영역 (제거할 배경색 및 오차 범위)
        frame_settings = tk.Frame(root, bg="#f9f9f9", relief="groove", bd=2)
        frame_settings.pack(fill="x", padx=20, pady=20, ipady=10)

        tk.Label(frame_settings, text="[배경 제거 설정]", bg="#f9f9f9", font=("맑은 고딕", 9, "bold")).pack(pady=5)
        
        # 제거할 배경색 선택
        frame_color = tk.Frame(frame_settings, bg="#f9f9f9")
        frame_color.pack(fill="x", padx=10, pady=5)
        tk.Label(frame_color, text="제거할 배경색:", bg="#f9f9f9").pack(side="left")
        self.lbl_bg_color = tk.Label(frame_color, text="   ", bg="#000000", width=5, relief="sunken") # 초기값 검정
        self.lbl_bg_color.pack(side="left", padx=5)
        btn_pick_color = tk.Button(frame_color, text="🎨 색상 변경", command=self.pick_bg_color, font=("맑은 고딕", 8))
        btn_pick_color.pack(side="left")
        self.lbl_rgb_info = tk.Label(frame_color, text="(0, 0, 0)", bg="#f9f9f9")
        self.lbl_rgb_info.pack(side="left", padx=5)

        # 오차 범위 설정
        frame_tol = tk.Frame(frame_settings, bg="#f9f9f9")
        frame_tol.pack(fill="x", padx=10, pady=5)
        tk.Label(frame_tol, text="색상 오차 범위 (0~255):", bg="#f9f9f9").pack(side="left")
        self.entry_tolerance = tk.Entry(frame_tol, width=10)
        self.entry_tolerance.insert(0, "20") # 기본 오차 20 (GIF 노이즈 감안)
        self.entry_tolerance.pack(side="left", padx=5)
        tk.Label(frame_tol, text="(캐릭터 테두리 찌꺼기가 남으면 높이세요.)", bg="#f9f9f9", fg="gray").pack(side="left", padx=5)

        # 4. 진행률 표시
        self.progress = ttk.Progressbar(root, orient="horizontal", length=400, mode="determinate")
        self.progress.pack(pady=10)
        self.lbl_status = tk.Label(root, text="작업 대기 중...", fg="blue")
        self.lbl_status.pack()

        # 5. 실행 버튼
        self.btn_run = tk.Button(root, text="🚀 모든 GIF 스마트 누끼따기 시작", bg="#1976D2", fg="white", 
                                 font=("맑은 고딕", 12, "bold"), command=self.run_background_removal)
        self.btn_run.pack(fill="x", padx=20, pady=10, ipady=10)

    # ==========================================
    # 로직 핸들링
    # ==========================================

    def browse_folder(self):
        folder = filedialog.askdirectory()
        if folder:
            self.entry_path.delete(0, tk.END)
            self.entry_path.insert(0, folder)

    def pick_bg_color(self):
        color_code = colorchooser.askcolor(title="제거할 배경색을 선택하세요", color=self.bg_rgb)
        if color_code[0]:
            self.bg_rgb = tuple(map(int, color_code[0]))
            self.lbl_bg_color.config(bg=color_code[1])
            self.lbl_rgb_info.config(text=f"({self.bg_rgb[0]}, {self.bg_rgb[1]}, {self.bg_rgb[2]})")

    def smart_flood_fill(self, img, tolerance):
        """[핵심] 플러드 필 알고리즘을 사용하여 프레임 외부 배경만 제거합니다.

        수정 포인트:
        - 투명 픽셀(a == 0)은 막힌 벽이 아니라, 바깥 배경과 이어지는 통로로 취급합니다.
        - 그래야 이미 투명한 영역 너머에 붙어 있는 검은 글리치 픽셀까지 탐색해서 제거할 수 있습니다.
        - 캐릭터/이펙트 색상은 통과하지 않는 벽으로 취급합니다.
        """
        rgba_img = img.convert('RGBA')
        width, height = rgba_img.size
        pixels = rgba_img.load()

        # 1. 제거할 대상 확인 변수
        target_r, target_g, target_b = self.bg_rgb
        processed = set() # 이미 확인한 좌표 (무한 루프 방지)
        
        # 2. 배경의 시작점(Seed) 설정: 프레임의 네 군데 모서리
        # 모서리가 투명이어도, 이제 투명 픽셀을 통로로 삼아 계속 탐색합니다.
        seeds = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
        queue = collections.deque(seeds) # 대량 처리를 위한 큐

        while queue:
            x, y = queue.popleft()

            # 좌표 유효성 검사 및 중복 검사
            if not (0 <= x < width and 0 <= y < height) or (x, y) in processed:
                continue
            
            processed.add((x, y)) # 방문 표시

            r, g, b, a = pixels[x, y]

            # 통과 가능 여부
            # 1) 이미 투명한 픽셀은 바깥 배경의 일부로 보고 통과만 합니다.
            if a == 0:
                passable = True

            # 2) 제거 대상 색상과 비슷한 불투명 픽셀은 투명 처리 후 통과합니다.
            elif (abs(r - target_r) <= tolerance and
                  abs(g - target_g) <= tolerance and
                  abs(b - target_b) <= tolerance):
                pixels[x, y] = (0, 0, 0, 0)
                passable = True

            # 3) 캐릭터/이펙트 색상은 벽으로 보고 탐색을 멈춥니다.
            else:
                passable = False

            # 통과 가능한 픽셀에서만 주변 4방향으로 계속 확장합니다.
            if passable:
                for dx, dy in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                    next_x, next_y = x + dx, y + dy
                    if (next_x, next_y) not in processed:
                        queue.append((next_x, next_y))
        
        return rgba_img

    def run_background_removal(self):
        folder_path = self.entry_path.get()
        if not os.path.isdir(folder_path):
            messagebox.showerror("오류", "유효한 폴더 경로를 선택해주세요.")
            return

        # GIF 파일 리스트 확보
        files = [f for f in os.listdir(folder_path) if f.lower().endswith('.gif')]
        
        if not files:
            messagebox.showinfo("알림", "폴더 내에 처리할 GIF 파일이 없습니다.")
            return

        try:
            tolerance = int(self.entry_tolerance.get())
        except:
            tolerance = 20

        # 결과 저장 폴더
        output_dir = os.path.join(folder_path, "smart_cleaned_gifs")
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)

        self.progress["maximum"] = len(files)
        success_count = 0

        print(f"\n▶ [작업 시작] 총 {len(files)}개의 GIF 배경 스마트 제거 진행 중...")
        print(f"   대상 배경색: {self.bg_rgb}, 오차 범위: {tolerance}")

        for i, filename in enumerate(files):
            input_path = os.path.join(folder_path, filename)
            self.lbl_status.config(text=f"누끼따기 중: {filename} ({i+1}/{len(files)})")
            self.root.update()

            try:
                # 1. 원본 GIF 열기 (with문으로 파일 확실히 닫기)
                with Image.open(input_path) as img:
                    durations = []
                    loop = img.info.get('loop', 0)
                    out_frames = []

                    # 2. 모든 프레임을 순회하며 배경 제거 작업 진행
                    for frame in ImageSequence.Iterator(img):
                        durations.append(frame.info.get('duration', 100))
                        
                        # [핵심] 플러드 필 로직 적용 (RGBA로 변환되어 반환됨)
                        cleaned_frame = self.smart_flood_fill(frame, tolerance)
                        out_frames.append(cleaned_frame)

                    # 3. 깨끗해진 프레임들을 묶어서 새로운 움짤로 저장
                    if out_frames:
                        save_path = os.path.join(output_dir, filename)
                        
                        # Pillow로 투명 GIF 저장 시 disposal=2 (다음 프레임 배경 지우기) 설정 필수
                        out_frames[0].save(
                            save_path,
                            save_all=True,
                            append_images=out_frames[1:],
                            duration=durations,
                            loop=loop,
                            disposal=2 
                        )
                        success_count += 1

            except Exception as e:
                print(f"❌ 파일 처리 실패 ({filename}): {e}")

            self.progress["value"] = i + 1

        self.lbl_status.config(text="스마트 누끼따기 완료!", fg="#1976D2")
        print("▶ [작업 완료] 모든 GIF 배경 제거 완료!")
        messagebox.showinfo("완료", f"총 {len(files)}개 중 {success_count}개의 GIF 배경을 스마트하게 제거하여\n'smart_cleaned_gifs' 폴더에 저장했습니다.")

if __name__ == "__main__":
    root = tk.Tk()
    AutoGIFBackgroundRemover(root)
    root.mainloop()
