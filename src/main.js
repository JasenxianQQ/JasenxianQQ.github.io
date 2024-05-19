import "./index.less";
import * as THREE from "three";
import VRHall from "./VRHall";
import { data } from "./models2";
import Zoomtastic from "zoomtastic";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

window.onload = function () {
    const vr = new VRHall({
        debugger: false,
        maxSize: 20,
        movieHight: 2,
        container: document.getElementById("root"),
        cameraOption: {
            position: { x: 0, y: 2, z: 0.699 },
            lookAt: { x: 5, y: 1, z: 1.096 },
        },
        onClick: (item) => {
            if (item.desc) {
                showInfo(item.desc, event.clientX, event.clientY);
            }
            if (item.type === 'guide') {
                vr.moveTo(item.position, item.view, 3);
            }
        },
    });

    Zoomtastic.mount();

    setupCamera();

    vr.loadHall({
        url: "./assets/room2/dm.glb",
        planeName: "dm",
        position: { x: 0, y: 0, z: 0 },
        scale: 5,
        rotation: { x: 0, y: 0, z: 0 },
    }).then(() => {
        // Hall loaded
    });

    vr.loadGLTF({
        url: "./assets/robot/robot1.glb",
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 5,
    }).then((gltf) => {
        gltf.scene.odata = { id: "robot1", name: "Interactive Robot" };
        vr.addClickEvent(gltf.scene);
    }).catch(error => {
        console.error('Failed to load the model:', error);
    });

    const loader = new GLTFLoader();
    data.forEach((item) => {
        if (item.type === "model") {
            loader.load(item.url, (gltf) => {
                const model = gltf.scene;
                model.position.set(item.position.x, item.position.y, item.position.z);
                model.scale.set(item.scale.x, item.scale.y, item.scale.z);
                model.rotation.set(item.rotation.x, item.rotation.y, item.rotation.z);
                model.name = item.name;
                model.userData = { ...item };
                vr._scene.add(model);
                vr._eventMeshs.push(model);
                vr._itemsData.push(item);
            }, undefined, (error) => {
                console.error('An error happened while loading the model:', error);
            });
        } else if (item.type === "guide") {
            vr.addGuidePoint(item.position, item.name, item.desc);
            vr._itemsData.push(item);
        }
    });

    window.addEventListener('click', (event) => {
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(mouse, vr._camera);
        const intersects = raycaster.intersectObjects(vr._eventMeshs);

        if (intersects.length > 0) {
            const selectedModel = intersects[0].object;
            if (selectedModel.userData.desc) {
                showInfo(selectedModel.userData.desc, event.clientX, event.clientY);
            }
            if (selectedModel.userData.type === 'guide') {
                vr.moveTo(selectedModel.userData.position, selectedModel.userData.view, 3);
            }
        }
    });

    function showInfo(desc, x, y) {
        let infoBox = document.getElementById('infoBox');
        if (!infoBox) {
            infoBox = createInfoBox();
        }
        infoBox.innerHTML = `信息: ${desc || "无描述"}`;
        infoBox.style.left = `${x + 10}px`;
        infoBox.style.top = `${y + 10}px`;
        infoBox.style.display = 'block';

        // 设置1秒后消失
        setTimeout(() => {
            infoBox.style.display = 'none';
        }, 1000);
    }

    function createInfoBox() {
        const infoBox = document.createElement('div');
        infoBox.id = 'infoBox';
        infoBox.style.position = 'absolute';
        infoBox.style.backgroundColor = 'white';
        infoBox.style.border = '1px solid black';
        infoBox.style.padding = '10px';
        infoBox.style.zIndex = '1000';
        document.body.appendChild(infoBox);
        return infoBox;
    }

    let shtml = `<li class="item" data-id="guide1">导览点1</li>`;
    shtml += `<li class="gravity">重力感应</li>`;
    document.querySelector(".view").innerHTML = shtml;

    document.querySelector(".gravity").addEventListener("click", () => {
        if (document.location.protocol === "https:") {
            vr.gravity.toggle();
        } else {
            alert("需要开启https");
        }
    });

    document.querySelectorAll(".item").forEach((target) => {
        target.addEventListener("click", () => {
            const id = target.dataset.id;
            vr.viewItem(id);
        });
    });
};

const video = document.getElementById('video');
const outputCanvas = document.createElement('canvas');
const outputContext = outputCanvas.getContext('2d');
document.body.appendChild(outputCanvas);

async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    await new Promise((resolve) => video.onloadedmetadata = resolve);
    outputCanvas.width = video.videoWidth;
    outputCanvas.height = video.videoHeight;
    return video;
}
