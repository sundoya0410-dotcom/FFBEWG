import os
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from PIL import Image, ImageSequence, ImageTk
from collections import deque


class GIFGlitchCleanerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("GIF 글리치 색상 스포이드 일괄 제거기")
        self.root.geometry("920x780")

        self.target_root_folder = ""
        self.sample_gif_path = ""
        self.sample_frames = []
        self.sample_durations = []
        self.current_frame_index = 0
        self.picked_colors = []
        self.tk_preview_image = None
        self.preview_meta = None

        self._build_ui()

    # =====================================================
    # UI
    # =====================================================
    def _build_ui(self):
        tk.Label(
            self.root,
            text="샘플 GIF에서 글리치 색을 찍고, 선택한 폴더의 모든 하위 폴더 GIF에 일괄 적용합니다.",
            font=("맑은 고딕", 11, "bold"),
            fg="#1976D2",
        ).pack(pady=(16, 6))
        tk.Label(
            self.root,
            text="권장 방식: 노란/초록/분홍 같은 튀는 글리치 배경을 클릭해서 등록한 뒤, 외곽과 연결된 같은 계열 색만 제거",
            font=("맑은 고딕", 9),
            fg="#444444",
        ).pack(pady=(0, 12))

        # 대상 폴더
        frame_root = tk.LabelFrame(self.root, text="1) 처리할 최상위 폴더", padx=10, pady=10)
        frame_root.pack(fill="x", padx=16, pady=6)

        self.entry_root = tk.Entry(frame_root)
        self.entry_root.pack(side="left", fill="x", expand=True)
        tk.Button(frame_root, text="폴더 선택", command=self.browse_root_folder).pack(side="left", padx=(8, 0))

        # 샘플 GIF
        frame_sample = tk.LabelFrame(self.root, text="2) 샘플 GIF 불러오기", padx=10, pady=10)
        frame_sample.pack(fill="x", padx=16, pady=6)

        self.entry_sample = tk.Entry(frame_sample)
        self.entry_sample.pack(side="left", fill="x", expand=True)
        tk.Button(frame_sample, text="GIF 선택", command=self.browse_sample_gif).pack(side="left", padx=(8, 0))
        tk.Button(frame_sample, text="다시 로드", command=self.reload_sample_gif).pack(side="left", padx=(8, 0))

        # 중앙 영역
        frame_center = tk.Frame(self.root)
        frame_center.pack(fill="both", expand=True, padx=16, pady=8)

        # 미리보기 영역
        frame_preview = tk.LabelFrame(frame_center, text="3) 프레임 미리보기 / 스포이드 클릭", padx=10, pady=10)
        frame_preview.pack(side="left", fill="both", expand=True)

        self.canvas = tk.Canvas(frame_preview, width=560, height=420, bg="#2B2B2B", highlightthickness=1, highlightbackground="#666")
        self.canvas.pack(fill="both", expand=True)
        self.canvas.bind("<Button-1>", self.on_canvas_click)

        frame_nav = tk.Frame(frame_preview)
        frame_nav.pack(fill="x", pady=(10, 0))

        tk.Button(frame_nav, text="◀ 이전 프레임", command=self.prev_frame).pack(side="left")
        tk.Button(frame_nav, text="다음 프레임 ▶", command=self.next_frame).pack(side="left", padx=6)

        self.frame_slider = tk.Scale(
            frame_nav,
            from_=0,
            to=0,
            orient="horizontal",
            command=self.on_slider_move,
            showvalue=False,
            length=260,
        )
        self.frame_slider.pack(side="left", fill="x", expand=True, padx=10)

        self.lbl_frame_info = tk.Label(frame_nav, text="프레임: - / -")
        self.lbl_frame_info.pack(side="left")

        self.lbl_click_info = tk.Label(
            frame_preview,
            text="미리보기에서 글리치 색을 클릭하세요. 같은 프레임에서 여러 번 찍어도 됩니다.",
            anchor="w",
            fg="#1976D2",
        )
        self.lbl_click_info.pack(fill="x", pady=(8, 0))

        # 우측 설정/색상 목록
        frame_right = tk.Frame(frame_center)
        frame_right.pack(side="left", fill="y", padx=(12, 0))

        frame_colors = tk.LabelFrame(frame_right, text="4) 등록된 글리치 색상", padx=10, pady=10)
        frame_colors.pack(fill="both", expand=True)

        self.list_colors = tk.Listbox(frame_colors, height=14)
        self.list_colors.pack(fill="both", expand=True)

        frame_color_btns = tk.Frame(frame_colors)
        frame_color_btns.pack(fill="x", pady=(8, 0))
        tk.Button(frame_color_btns, text="선택 색상 삭제", command=self.remove_selected_color).pack(fill="x")
        tk.Button(frame_color_btns, text="전체 색상 비우기", command=self.clear_colors).pack(fill="x", pady=(6, 0))

        self.lbl_last_color = tk.Label(frame_colors, text="마지막 선택 색상: 없음", anchor="w")
        self.lbl_last_color.pack(fill="x", pady=(10, 0))

        frame_settings = tk.LabelFrame(frame_right, text="5) 처리 설정", padx=10, pady=10)
        frame_settings.pack(fill="x", pady=(12, 0))

        row_tol = tk.Frame(frame_settings)
        row_tol.pack(fill="x", pady=4)
        tk.Label(row_tol, text="색상 오차 범위:").pack(side="left")
        self.entry_tolerance = tk.Entry(row_tol, width=8)
        self.entry_tolerance.insert(0, "28")
        self.entry_tolerance.pack(side="left", padx=(6, 0))

        row_out = tk.Frame(frame_settings)
        row_out.pack(fill="x", pady=4)
        tk.Label(row_out, text="출력 폴더명:").pack(side="left")
        self.entry_output_name = tk.Entry(row_out, width=18)
        self.entry_output_name.insert(0, "glitch_cleaned_gifs")
        self.entry_output_name.pack(side="left", padx=(6, 0))

        tk.Label(
            frame_settings,
            text="※ 외곽과 연결된 같은 계열 색만 제거합니다.\n캐릭터 내부의 비슷한 색은 최대한 보존합니다.",
            justify="left",
            fg="#666666",
        ).pack(anchor="w", pady=(6, 0))

        # 진행률
        frame_progress = tk.LabelFrame(self.root, text="6) 진행 상황", padx=10, pady=10)
        frame_progress.pack(fill="x", padx=16, pady=6)

        self.progress = ttk.Progressbar(frame_progress, orient="horizontal", mode="determinate")
        self.progress.pack(fill="x")
        self.lbl_status = tk.Label(frame_progress, text="작업 대기 중...", fg="#1976D2", anchor="w")
        self.lbl_status.pack(fill="x", pady=(6, 0))

        self.btn_run = tk.Button(
            self.root,
            text="🚀 하위 폴더 포함 전체 GIF 글리치 제거 시작",
            bg="#1976D2",
            fg="white",
            font=("맑은 고딕", 12, "bold"),
            command=self.run_batch_cleaning,
        )
        self.btn_run.pack(fill="x", padx=16, pady=(8, 16), ipady=10)

    # =====================================================
    # 파일 로드 / 프리뷰
    # =====================================================
    def browse_root_folder(self):
        folder = filedialog.askdirectory(title="처리할 최상위 폴더 선택")
        if folder:
            self.target_root_folder = folder
            self.entry_root.delete(0, tk.END)
            self.entry_root.insert(0, folder)

    def browse_sample_gif(self):
        file_path = filedialog.askopenfilename(
            title="샘플 GIF 선택",
            filetypes=[("GIF files", "*.gif")],
        )
        if file_path:
            self.entry_sample.delete(0, tk.END)
            self.entry_sample.insert(0, file_path)
            self.load_sample_gif(file_path)

    def reload_sample_gif(self):
        file_path = self.entry_sample.get().strip()
        if not file_path:
            messagebox.showwarning("알림", "먼저 샘플 GIF를 선택해주세요.")
            return
        self.load_sample_gif(file_path)

    def load_sample_gif(self, file_path):
        try:
            frames = []
            durations = []
            with Image.open(file_path) as img:
                for frame in ImageSequence.Iterator(img):
                    frames.append(frame.copy().convert("RGBA"))
                    durations.append(frame.info.get("duration", img.info.get("duration", 100)))

            if not frames:
                messagebox.showerror("오류", "샘플 GIF에서 프레임을 읽지 못했습니다.")
                return

            self.sample_gif_path = file_path
            self.sample_frames = frames
            self.sample_durations = durations
            self.current_frame_index = 0
            self.frame_slider.config(to=max(0, len(frames) - 1))
            self.frame_slider.set(0)
            self.render_preview()
            self.lbl_status.config(text=f"샘플 GIF 로드 완료: {os.path.basename(file_path)}")
        except Exception as e:
            messagebox.showerror("오류", f"샘플 GIF를 불러오지 못했습니다.\n{e}")

    def render_preview(self):
        self.canvas.delete("all")

        if not self.sample_frames:
            self.canvas.create_text(
                280,
                210,
                text="샘플 GIF를 불러오면 여기에 미리보기가 표시됩니다.",
                fill="white",
                font=("맑은 고딕", 11),
            )
            self.lbl_frame_info.config(text="프레임: - / -")
            self.preview_meta = None
            return

        frame = self.sample_frames[self.current_frame_index]
        canvas_w = max(1, self.canvas.winfo_width())
        canvas_h = max(1, self.canvas.winfo_height())
        if canvas_w <= 1 or canvas_h <= 1:
            canvas_w, canvas_h = 560, 420

        img_w, img_h = frame.size
        scale = min(canvas_w / img_w, canvas_h / img_h)
        scale = max(scale, 1)
        display_w = max(1, int(img_w * scale))
        display_h = max(1, int(img_h * scale))

        preview = frame.resize((display_w, display_h), Image.NEAREST)
        self.tk_preview_image = ImageTk.PhotoImage(preview)

        offset_x = (canvas_w - display_w) // 2
        offset_y = (canvas_h - display_h) // 2
        self.canvas.create_image(offset_x, offset_y, image=self.tk_preview_image, anchor="nw")
        self.canvas.create_rectangle(offset_x, offset_y, offset_x + display_w, offset_y + display_h, outline="#888")

        self.preview_meta = {
            "scale": scale,
            "offset_x": offset_x,
            "offset_y": offset_y,
            "display_w": display_w,
            "display_h": display_h,
            "img_w": img_w,
            "img_h": img_h,
        }
        self.lbl_frame_info.config(text=f"프레임: {self.current_frame_index + 1} / {len(self.sample_frames)}")

    def on_slider_move(self, value):
        if not self.sample_frames:
            return
        self.current_frame_index = int(float(value))
        self.render_preview()

    def prev_frame(self):
        if not self.sample_frames:
            return
        self.current_frame_index = (self.current_frame_index - 1) % len(self.sample_frames)
        self.frame_slider.set(self.current_frame_index)
        self.render_preview()

    def next_frame(self):
        if not self.sample_frames:
            return
        self.current_frame_index = (self.current_frame_index + 1) % len(self.sample_frames)
        self.frame_slider.set(self.current_frame_index)
        self.render_preview()

    def on_canvas_click(self, event):
        if not self.sample_frames or not self.preview_meta:
            return

        meta = self.preview_meta
        x = event.x - meta["offset_x"]
        y = event.y - meta["offset_y"]

        if x < 0 or y < 0 or x >= meta["display_w"] or y >= meta["display_h"]:
            return

        src_x = min(meta["img_w"] - 1, int(x / meta["scale"]))
        src_y = min(meta["img_h"] - 1, int(y / meta["scale"]))

        pixel = self.sample_frames[self.current_frame_index].getpixel((src_x, src_y))
        rgb = tuple(pixel[:3])
        hex_color = self.rgb_to_hex(rgb)

        if rgb not in self.picked_colors:
            self.picked_colors.append(rgb)
            self.list_colors.insert(tk.END, f"{hex_color}  RGB{rgb}")

        self.lbl_last_color.config(text=f"마지막 선택 색상: {hex_color} / RGB{rgb}")
        self.lbl_click_info.config(text=f"클릭 좌표: ({src_x}, {src_y})  |  선택 색상: {hex_color} / RGB{rgb}")

    def remove_selected_color(self):
        selection = self.list_colors.curselection()
        if not selection:
            return
        idx = selection[0]
        self.list_colors.delete(idx)
        del self.picked_colors[idx]

    def clear_colors(self):
        self.picked_colors.clear()
        self.list_colors.delete(0, tk.END)
        self.lbl_last_color.config(text="마지막 선택 색상: 없음")

    # =====================================================
    # 핵심 처리 로직
    # =====================================================
    @staticmethod
    def rgb_to_hex(rgb):
        return "#%02x%02x%02x" % rgb

    @staticmethod
    def color_matches_any(rgb, targets, tolerance):
        r, g, b = rgb
        for tr, tg, tb in targets:
            if (
                abs(r - tr) <= tolerance
                and abs(g - tg) <= tolerance
                and abs(b - tb) <= tolerance
            ):
                return True
        return False

    def remove_edge_connected_glitch(self, img, targets, tolerance):
        """
        선택한 글리치 색상과 비슷한 픽셀 중,
        프레임 외곽과 연결된 영역만 투명화한다.
        """
        rgba = img.convert("RGBA")
        width, height = rgba.size
        pixels = rgba.load()

        visited = bytearray(width * height)
        queue = deque()

        # 전체 외곽선을 seed로 사용
        for x in range(width):
            queue.append((x, 0))
            queue.append((x, height - 1))
        for y in range(height):
            queue.append((0, y))
            queue.append((width - 1, y))

        neighbors = [
            (1, 0), (-1, 0), (0, 1), (0, -1),
            (1, 1), (1, -1), (-1, 1), (-1, -1),
        ]

        while queue:
            x, y = queue.popleft()
            if x < 0 or y < 0 or x >= width or y >= height:
                continue

            idx = y * width + x
            if visited[idx]:
                continue
            visited[idx] = 1

            r, g, b, a = pixels[x, y]
            if a == 0:
                continue

            if not self.color_matches_any((r, g, b), targets, tolerance):
                continue

            pixels[x, y] = (0, 0, 0, 0)

            for dx, dy in neighbors:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height:
                    nidx = ny * width + nx
                    if not visited[nidx]:
                        queue.append((nx, ny))

        return rgba

    def collect_gif_files_recursive(self, root_folder, output_root):
        gif_files = []
        output_root_abs = os.path.abspath(output_root)
        root_abs = os.path.abspath(root_folder)

        for current_root, dirs, files in os.walk(root_abs):
            current_abs = os.path.abspath(current_root)
            if current_abs.startswith(output_root_abs):
                continue

            for name in files:
                if name.lower().endswith(".gif"):
                    gif_files.append(os.path.join(current_root, name))

        return gif_files

    def process_one_gif(self, input_path, save_path, targets, tolerance):
        with Image.open(input_path) as img:
            durations = []
            out_frames = []
            loop = img.info.get("loop", 0)

            for frame in ImageSequence.Iterator(img):
                durations.append(frame.info.get("duration", img.info.get("duration", 100)))
                cleaned = self.remove_edge_connected_glitch(frame, targets, tolerance)
                out_frames.append(cleaned)

            if not out_frames:
                raise RuntimeError("프레임을 읽지 못했습니다.")

            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            out_frames[0].save(
                save_path,
                save_all=True,
                append_images=out_frames[1:],
                duration=durations,
                loop=loop,
                disposal=2,
                optimize=False,
            )

    # =====================================================
    # 배치 실행
    # =====================================================
    def run_batch_cleaning(self):
        root_folder = self.entry_root.get().strip()
        if not root_folder or not os.path.isdir(root_folder):
            messagebox.showerror("오류", "유효한 최상위 폴더를 선택해주세요.")
            return

        if not self.sample_frames:
            messagebox.showerror("오류", "샘플 GIF를 먼저 불러와주세요.")
            return

        if not self.picked_colors:
            messagebox.showerror("오류", "샘플 프레임에서 글리치 색을 최소 1개 이상 찍어주세요.")
            return

        try:
            tolerance = int(self.entry_tolerance.get().strip())
            tolerance = max(0, min(255, tolerance))
        except ValueError:
            messagebox.showerror("오류", "색상 오차 범위는 0~255 사이 숫자로 입력해주세요.")
            return

        output_name = self.entry_output_name.get().strip() or "glitch_cleaned_gifs"
        output_root = os.path.join(root_folder, output_name)
        os.makedirs(output_root, exist_ok=True)

        gif_files = self.collect_gif_files_recursive(root_folder, output_root)
        if not gif_files:
            messagebox.showinfo("알림", "선택한 폴더 및 하위 폴더에서 GIF 파일을 찾지 못했습니다.")
            return

        self.btn_run.config(state="disabled")
        self.progress["value"] = 0
        self.progress["maximum"] = len(gif_files)

        success_count = 0
        failed_files = []

        try:
            for idx, input_path in enumerate(gif_files, start=1):
                rel_path = os.path.relpath(input_path, root_folder)
                save_path = os.path.join(output_root, rel_path)

                self.lbl_status.config(text=f"처리 중 ({idx}/{len(gif_files)}): {rel_path}")
                self.root.update_idletasks()

                try:
                    self.process_one_gif(input_path, save_path, self.picked_colors, tolerance)
                    success_count += 1
                except Exception as e:
                    failed_files.append((rel_path, str(e)))

                self.progress["value"] = idx
                self.root.update_idletasks()

        finally:
            self.btn_run.config(state="normal")

        if failed_files:
            preview = "\n".join([f"- {name}" for name, _ in failed_files[:8]])
            extra = "\n..." if len(failed_files) > 8 else ""
            self.lbl_status.config(text=f"완료: 성공 {success_count} / 실패 {len(failed_files)}", fg="#D32F2F")
            messagebox.showwarning(
                "일부 파일 처리 실패",
                f"총 {len(gif_files)}개 중 {success_count}개 성공, {len(failed_files)}개 실패했습니다.\n\n"
                f"실패 예시:\n{preview}{extra}\n\n"
                f"출력 폴더: {output_root}",
            )
        else:
            self.lbl_status.config(text=f"완료: 총 {success_count}개 GIF 처리 완료", fg="#1976D2")
            messagebox.showinfo(
                "완료",
                f"총 {success_count}개의 GIF 글리치를 제거했습니다.\n\n출력 폴더:\n{output_root}",
            )


if __name__ == "__main__":
    root = tk.Tk()
    app = GIFGlitchCleanerApp(root)
    root.mainloop()
