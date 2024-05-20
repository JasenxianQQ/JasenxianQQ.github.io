import * as THREE from '../node_modules/three/build/three.module.js';
import CameraControls from '@controls/dist/camera-controls.module.js';
import { GLTFLoader } from '@three/examples/jsm/loaders/GLTFLoader.js';
import { TransformControls } from '@three/examples/jsm/controls/TransformControls.js';
import { VRButton } from '@three/examples/jsm/webxr/VRButton.js';
import { Reflector } from './Reflector';
import offset from 'offset';
import Gravity from './Gravity';

CameraControls.install({ THREE: THREE });

export class VRHall {
  _options = {
    debugger: false,
    maxSize: 20,
    movieHight: 3,
    container: document.body,
    onClick: null,
    cameraOption: {
      position: { x: 0, y: 3, z: 0 },
      lookAt: { x: 2, y: 2, z: 2 },
    },
  };

  _size = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  _webcamVideo = null;
  _renderer = null;
  _camera = null;
  _scene = null;
  _clock = new THREE.Clock();
  _controls = null;
  _requestAnimate = null;
  _EPS = 1e-5;
  _gltfLoader = new GLTFLoader();
  _raycaster = new THREE.Raycaster();
  _hallMesh = null;
  _hallPlaneName = "plane";
  _planeMesh = null;
  _textLoader = new THREE.TextureLoader();
  _eventMeshs = [];
  _transfromControls = null;
  _events = {};
  _itemsData = [];
  _animates = [];
  gravity = null;

  constructor(options) {
    Object.assign(this._options, options);
    this._size.width = this._options.container.clientWidth;
    this._size.height = this._options.container.clientHeight;
    this._init();
    this._bindEvent();
    this._lookat().then(() => {
      if (this._options.callback) {
        this._options.callback();
      }
    });
    this._animate();
    window.addEventListener("resize", this._resize.bind(this));
    this.setupFullscreenButton();

    this.initWebCamera().then(() => {
      this.setupCaptureButton();
      this.setupTogglePredictButton();
      this.setupOrientationButton();
      this.loadAndPredict();
    }).catch(error => {
      console.error("Web camera initialization failed:", error);
    });

    this.setupOrientationChangeListener();

    if (this._options.debugger) {
      this._initTransformControls();
      this._scene.add(new THREE.AxesHelper(1000));
    }
    this.gravity = new Gravity(this._controls);
  }

  initVRButton = (target = document.body) => {
    this._renderer.xr.enabled = true;
    this._renderer.xr.setReferenceSpaceType("local");
    target.appendChild(VRButton.createButton(this._renderer));
  };

  addAnimate(afun) {
    this._animates.push(afun);
  }

  addClickEvent(mesh) {
    this._eventMeshs.push(mesh);
  }

  _reflectorPlane() {
    const size = 1000;
    const geometry = new THREE.PlaneBufferGeometry(size, size);
    const verticalMirror = new Reflector(geometry, {
      opacity: 0.1,
      textureWidth: size,
      textureHeight: size,
      color: "#fff",
    });
    verticalMirror.material.side = THREE.DoubleSide;
    verticalMirror.material.transparent = true;
    verticalMirror.material.opacity = 0.1;
    verticalMirror.rotation.x = -Math.PI / 2;
    verticalMirror.position.y = this._planeMesh.position.y + 0.1;
    this._scene.add(verticalMirror);
  }

  _init() {
    // 初始化渲染器
    this._renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      transparent: true,
      logarithmicDepthBuffer: true,
    });
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.sortObjects = true;
    this._renderer.setSize(this._size.width, this._size.height);
    this._options.container.innerHTML = "";
    this._options.container.appendChild(this._renderer.domElement);
  
    // 设置渲染器的背景颜色为白色
    this._renderer.setClearColor(0xffffff);
    this._renderer.setClearAlpha(1);
  
    // 初始化场景
    this._scene = new THREE.Scene();
  
    // 获取窗口尺寸
    const width = this._size.width;
    const height = this._size.height;
  
    // 初始化相机
    this._camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 10000);
    this._scene.add(this._camera);
  
    // 添加环境光
    this._scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  
    // 添加平行光
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.65);
    dirLight.position.set(5, 5, 5);
    this._scene.add(dirLight);
  
    // 初始化控制器
    this._controls = new CameraControls(this._camera, this._renderer.domElement);
    this._controls.maxDistance = this._EPS;
    this._controls.minZoom = 0.5;
    this._controls.maxZoom = 5;
    this._controls.dragToOffset = false;
    this._controls.distance = 1;
    this._controls.dampingFactor = 0.02;
    this._controls.truckSpeed = 0.01;
    this._controls.mouseButtons.wheel = CameraControls.ACTION.ZOOM;
    this._controls.mouseButtons.right = CameraControls.ACTION.NONE;
    this._controls.touches.two = CameraControls.ACTION.TOUCH_ZOOM;
    this._controls.touches.three = CameraControls.ACTION.NONE;
    this._controls.azimuthRotateSpeed = -0.5;
    this._controls.polarRotateSpeed = -0.5;
    this._controls.saveState();
  
    // 确保在窗口大小调整时，渲染器尺寸和相机的长宽比也能跟着调整
    window.addEventListener('resize', this._resize.bind(this));
  }
  

  _initTransformControls() {
    this._transformControls = new TransformControls(this._camera, this._renderer.domElement);
    this._transformControls.setSpace("local");

    this._transformControls.addEventListener("mouseDown", () => {
      this._controls.enabled = false;
    });

    this._transformControls.addEventListener("mouseUp", () => {
      this._controls.enabled = true;
    });

    this._transformControls.addEventListener("objectChange", (e) => {
      const { position, scale, rotation } = this._transformControls.object;
      // You can log the changes if needed for debugging.
    });

    window.addEventListener("keydown", (e) => {
      e.key === "q" && this._transformControls.setMode("translate");
      e.key === "w" && this._transformControls.setMode("rotate");
      e.key === "e" && this._transformControls.setMode("scale");
    });

    this._scene.add(this._transformControls);
  }

  _resize() {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight;
    this._renderer.setSize(newWidth, newHeight);
    this._camera.aspect = newWidth / newHeight;
    this._camera.updateProjectionMatrix();
  }

  createAnimate(gltf, { animateIndex, duration } = { animateIndex: 0, duration: 10 }) {
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const ani = gltf.animations[animateIndex];
    const AnimationAction = mixer.clipAction(ani);
    AnimationAction.setDuration(duration).play();
    mixer.update(0);
    this.addAnimate((d) => {
      mixer.update(d);
    });
    return mixer;
  }

  viewItem(id) {
    const item = this._itemsData.find((d) => d.id === id);
    if (item) {
        this.moveTo(item.position, item.view);
    } else {
        console.error(`id不存在: ${id}`);
    }
}

moveTo(position, lookat, duration = 3) {
    this._controls.setLookAt(
        position.x,
        position.y,
        position.z,
        lookat.x,
        lookat.y,
        lookat.z,
        true
    ).then(() => {
        // Handle the success of the move operation
    }).catch(err => {
        console.error('Failed to move camera:', err);
    });
}

  _findParentOdata(mesh) {
    if (mesh.userData && mesh.userData.desc) {
      return mesh;
    } else {
      if (mesh.parent) {
        return this._findParentOdata(mesh.parent);
      } else {
        return null;
      }
    }
  }

  _getBoxRaycaster({ x, y }, meshes) {
    const container = this._options.container;
    this._mouse = new THREE.Vector2();
    this._mouse.set(
      (x / container.clientWidth) * 2 - 1,
      -(y / container.clientHeight) * 2 + 1
    );
    this._raycaster.setFromCamera(this._mouse, this._camera);
    const intersects = this._raycaster.intersectObjects(
      [...meshes, ...this._eventMeshs],
      true
    );
    const intersect = intersects[0];
    if (intersect) {
      const v3 = intersects[0].point;
      const lookat = this._camera.position.lerp(v3, 1 + this._EPS);
      const mesh = intersect.object;

      const odataMesh = this._findParentOdata(mesh);

      if (this._options.debugger && odataMesh && this._transformControls) {
        this._transformControls.attach(odataMesh);
      }

      if (odataMesh && this._options.onClick) {
        this._options.onClick(odataMesh.userData);
      }

      return { position: v3, lookat, mesh };
    } 

    return false;
  }

  async _lookat() {
    if (!this._options.cameraOption) {
      return;
    }
    const { position, lookAt } = this._options.cameraOption;
    const lookatV3 = new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z);
    this._controls.zoomTo(0.8);
    await this._controls.setLookAt(
      position.x,
      position.y,
      position.z,
      lookatV3.x,
      lookatV3.y,
      lookatV3.z,
      false
    );
  }
  

  _animate() {
    const delta = this._clock.getDelta();
    if (this._controls) {
      this._controls.update(delta);
    }
    if (this._renderer) {
      this._renderer.clear();  // Clear before rendering
      this._renderer.render(this._scene, this._camera);
    }

    if (this._animates) {
      this._animates.forEach((afun) => {
        afun(delta);
      });
    }

    this._requestAnimate = requestAnimationFrame(this._animate.bind(this));
  }

  _mouseDown(event) {
    this._events.startXY = { x: event.clientX, y: event.clientY };
  }

  _mouseUp(event) {
    const { top, left } = offset(this._options.container);
    const { x, y } = this._events.startXY;
    const offsetPoor = 2;

    if (
        Math.abs(event.clientX - x) > offsetPoor ||
        Math.abs(event.clientY - y) > offsetPoor
    ) {
        return;
    }

    const rayRes = this._getBoxRaycaster(
        {
            x: event.clientX - left,
            y: event.clientY - top,
        },
        [this._hallMesh]
    );

    if (rayRes) {
        const { position, lookat, mesh } = rayRes;

        // Check if the clicked mesh or its parent is the hall plane
        let targetMesh = mesh;
        while (targetMesh && targetMesh.name !== this._hallPlaneName) {
            targetMesh = targetMesh.parent;
        }

        if (targetMesh && targetMesh.name === this._hallPlaneName) {
            this.moveTo(
                { x: position.x, y: this._options.movieHight, z: position.z },
                { x: lookat.x, y: this._options.movieHight, z: lookat.z },
                3
            );
        }

        // 处理点击事件，显示描述信息
        const odataMesh = this._findParentOdata(mesh);
        if (odataMesh && this._options.onClick) {
            this._options.onClick(odataMesh.userData);
        }
    }
}


  _bindEvent() {
    this._options.container.addEventListener(
      "mousedown",
      this._mouseDown.bind(this)
    );
    this._options.container.addEventListener(
      "mouseup",
      this._mouseUp.bind(this)
    );
  }

  loadGLTF(params) {
    return new Promise((resolve) => {
      const {
        url,
        position,
        scale = 1,
        rotation,
        onProgress,
        animate,
        autoLight,
      } = params;
      this._gltfLoader.load(
        url,
        (gltf) => {
          const mesh = gltf.scene;
          const box = new THREE.Box3()
            .setFromObject(mesh)
            .getSize(new THREE.Vector3());

          if (autoLight) {
            gltf.scene.traverse((child) => {
              if (child.isMesh) {
                const emissiveIntensity = 0.5;
                child.material.emissive = child.material.color.clone().multiplyScalar(emissiveIntensity);
                if (child.material.map) {
                  child.material.emissiveMap = child.material.map;
                  child.material.needsUpdate = true;
                }
              }
            });
          }

          mesh.scale.set(scale, scale, scale);
          if (position) {
            mesh.position.y = position.y;
            mesh.position.x = position.x;
            mesh.position.z = position.z;
          }
          if (rotation) {
            mesh.rotation.y = rotation.y;
            mesh.rotation.x = rotation.x;
            mesh.rotation.z = rotation.z;
          }
          mesh.userData = { ...params };
          this._scene.add(mesh);
          if (animate) {
            mesh.animations = animate;
          }
          resolve(gltf);
        },
        (progress) => {
          if (onProgress) {
            onProgress(progress);
          }
        },
        (err) => {
          console.error(err);
        }
      );
    });
  }

  async loadHall(params) {
    this._hallPlaneName = params.planeName;
    return await this.loadGLTF({ ...params }).then((gltf) => {
      this._hallMesh = gltf.scene;
      gltf.scene.traverse((mesh) => {
        if (mesh.name === params.planeName) {
          this._planeMesh = mesh;
        }
      });
      return gltf;
    });
  }

  loadItems(data) {
    this._itemsData = data;
    const { maxSize } = this._options;
    data.forEach(async (item) => {
      const texture = await this._textLoader.loadAsync(item.url);
      if (texture.image.width > maxSize) {
        item.width = maxSize;
        item.height = (maxSize / texture.image.width) * texture.image.height;
      } else {
        item.height = MAX;
        item.width = (maxSize / texture.image.height) * texture.image.width;
      }

      const geometry = new THREE.BoxGeometry(
        item.width,
        item.height,
        item.depth ? item.depth : 2
      );
      const materialBorder = new THREE.MeshBasicMaterial({
        color: item.color ? item.color : "#ffffff",
        
      });
      const material = new THREE.MeshBasicMaterial({
        color: item.color ? item.color : "#ffffff",
        map: texture,
      });
      const cube = new THREE.Mesh(geometry, [
        materialBorder,
        materialBorder,
        materialBorder,
        materialBorder,
        materialBorder,
        material,
      ]);
      cube.name = item.name;
      cube.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
      cube.scale.set(item.scale.x, item.scale.y, item.scale.z);
      cube.position.set(item.position.x, item.position.y, item.position.z);
      cube.userData = item;
      this._scene.add(cube);
      this._eventMeshs.push(cube);
    });
  }

  setupOrientationChangeListener() {
    const mediaQueryList = window.matchMedia("(orientation: portrait)");
    mediaQueryList.addEventListener("change", this.handleOrientationChange.bind(this));
    this.handleOrientationChange(mediaQueryList);
  }

  handleOrientationChange(event) {
    if (event.matches) {
      this.handlePortraitMode();
    } else {
      this.handleLandscapeMode();
    }
  }

  handlePortraitMode() {
    const video = this.webcamVideo;
    const canvas = document.getElementById('segmentationCanvas');
    if (video && canvas) {
      video.style.width = '100%';
      video.style.height = 'auto';
      canvas.style.width = '100%';
      canvas.style.height = 'auto';
    }
  }

  handleLandscapeMode() {
    const video = this.webcamVideo;
    const canvas = document.getElementById('segmentationCanvas');
    if (video && canvas) {
      video.style.height = '100%';
      video.style.width = 'auto';
      canvas.style.height = '100%';
      canvas.style.width = 'auto';
    }
  }

  setupFullscreenButton() {
    const button = document.getElementById('fullscreenButton');
    button.addEventListener('click', () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().then(() => {
          button.style.display = 'none';
        }).catch(console.error);
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen().then(() => {
          button.style.display = 'none';
        }).catch(console.error);
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen().then(() => {
          button.style.display = 'none';
        }).catch(console.error);
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen().then(() => {
          button.style.display = 'none';
        }).catch(console.error);
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        button.style.display = 'block';
      }
    });

    document.addEventListener('mozfullscreenchange', () => {
      if (!document.mozFullScreenElement) {
        button.style.display = 'block';
      }
    });

    document.addEventListener('webkitfullscreenchange', () => {
      if (!document.webkitFullscreenElement) {
        button.style.display = 'block';
      }
    });

    document.addEventListener('msfullscreenchange', () => {
      if (!document.msFullscreenElement) {
        button.style.display = 'block';
      }
    });
  }

  addGuidePoint(position, name, desc) {
    const geometry = new THREE.SphereGeometry(0.1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const guidePoint = new THREE.Mesh(geometry, material);
    guidePoint.position.set(position.x, position.y, position.z);
    guidePoint.name = name;
    guidePoint.userData = { desc };
    this._scene.add(guidePoint);
    this._eventMeshs.push(guidePoint);
  }

  async initWebCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      this.webcamVideo = document.createElement('video');
      this.webcamVideo.style.position = 'absolute';
      this.webcamVideo.style.right = '10px';
      this.webcamVideo.style.bottom = '10px';
      this.webcamVideo.style.width = '160px';
      this.webcamVideo.style.height = '120px';
      document.body.appendChild(this.webcamVideo);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        this.webcamVideo.srcObject = stream;
        this.webcamVideo.play();
      } catch (error) {
        console.error('Error accessing the webcam:', error);
        throw error;
      }
    } else {
      console.error('Your browser does not support web cameras.');
      return;
    }
  }

  async loadAndPredict() {
    const canvas = document.createElement('canvas');
    canvas.id = 'segmentationCanvas';
    canvas.height = window.innerHeight * 0.7;
    canvas.width = (canvas.height / this.webcamVideo.videoHeight) * this.webcamVideo.videoWidth;
    canvas.style.position = 'absolute';
    canvas.style.left = '50%';
    canvas.style.top = '50%';
    canvas.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const net = await bodyPix.load();

    const renderFrame = async () => {
      if (!canvas.parentElement) {
        return;
      }
      const segmentation = await net.segmentPerson(this.webcamVideo, {
        flipHorizontal: false,
        internalResolution: 'medium',
        segmentationThreshold: 0.7
      });
      const mask = bodyPix.toMask(segmentation);
      const foregroundColor = { r: 255, g: 255, b: 255, a: 255 };
      const backgroundColor = { r: 0, g: 0, b: 0, a: 0 };

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      bodyPix.drawMask(
        canvas, this.webcamVideo, mask, foregroundColor, backgroundColor, false
      );

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 0) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);

      if (this.isPredicting) {
        requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();
    return canvas;
  }

  setupCaptureButton() {
    const button = document.getElementById('captureButton');
    button.addEventListener('click', () => this.captureSceneAndWebcam());
  }

  setupTogglePredictButton() {
    const button = document.getElementById('togglePredictButton');
    this.isPredicting = false;
    this.predictCanvas = null;

    const startPrediction = async () => {
      this.isPredicting = true;
      button.textContent = '关闭合照';
      this.predictCanvas = await this.loadAndPredict();
    };

    const stopPrediction = () => {
      this.isPredicting = false;
      button.textContent = '开启合照';
      if (this.predictCanvas && this.predictCanvas.parentElement) {
        document.body.removeChild(this.predictCanvas);
        this.predictCanvas = null;
      }
    };

    button.addEventListener('click', () => {
      if (this.isPredicting) {
        stopPrediction();
      } else {
        startPrediction();
      }
    });
  }

  async captureSceneAndWebcam() {
    if (this._renderer) {
      this._renderer.render(this._scene, this._camera);
      const sceneDataURL = this._renderer.domElement.toDataURL('image/png');

      if (this.isPredicting && this.predictCanvas) {
        const webcamDataURL = this.predictCanvas.toDataURL('image/png');

        const mergedImageURL = await this.mergeImages(sceneDataURL, webcamDataURL);

        this.displayCapturedImage(mergedImageURL);
        this.downloadImage(mergedImageURL, 'composite.png');
      } else {
        this.displayCapturedImage(sceneDataURL);
        this.downloadImage(sceneDataURL, 'scene.png');
      }
    } else {
      console.error("Renderer is not initialized.");
    }
  }

  async mergeImages(sceneDataURL, webcamDataURL) {
    const sceneImage = new Image();
    const webcamImage = new Image();

    sceneImage.src = sceneDataURL;
    webcamImage.src = webcamDataURL;

    await new Promise(resolve => {
      sceneImage.onload = resolve;
      webcamImage.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = this._renderer.domElement.width;
    canvas.height = this._renderer.domElement.height;

    ctx.drawImage(sceneImage, 0, 0);

    const targetHeight = canvas.height * 0.65;
    const targetWidth = (targetHeight / webcamImage.height) * webcamImage.width;

    const videoCanvasX = (canvas.width - targetWidth) / 2;
    const videoCanvasY = (canvas.height - targetHeight) / 2;

    ctx.drawImage(webcamImage, videoCanvasX, videoCanvasY, targetWidth, targetHeight);

    return canvas.toDataURL('image/png');
  }

  displayCapturedImage(imageDataUrl) {
    const img = new Image();
    img.src = imageDataUrl;
    document.body.appendChild(img);
  }

  downloadImage(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  autoEnterFullscreen() {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.mozRequestFullScreen) {
        document.documentElement.mozRequestFullScreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
      }
    });
  }

  destroy() {
    this._options.container.removeEventListener(
      "mousedown",
      this._mouseDown.bind(this)
    );
    this._options.container.removeEventListener(
      "mouseup",
      this._mouseUp.bind(this)
    );
    window.removeEventListener("resize", this._resize.bind(this));

    this.gravity = null;
    this.gravity.destroy();

    this._renderer.dispose();

    this._options = null;
    this._renderer = null;
    this._camera = null;
    this._scene = null;
    this._clock = null;
    this._controls = null;
    cancelAnimationFrame(this._requestAnimate);
    this._requestAnimate = null;
    this._gltfLoader = null;
    this._raycaster = null;
    this._hallMesh = null;
    this._planeMesh = null;
    this._textLoader = null;
    this._eventMeshs = null;
    this._transfromControls = null;
    this._events = null;
    this._itemsData = null;
    this._animates = null;
  }
}
