import React, { Component } from 'react';
import { Button, InputGroup, InputGroupAddon, InputGroupText, Input, ButtonGroup, ButtonDropdown, DropdownToggle, DropdownMenu, DropdownItem, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog, faMicrochip, faPlay, faStop, faSave, faFolderOpen, faPlus, faFile, faStore, faCalculator, faEye } from '@fortawesome/free-solid-svg-icons'
import Switch from "react-switch";
import { CSSTransition } from "react-transition-group";
import './Title.css'
import { manager } from './Service/FPGAManager';
import { pjManager } from './Service/ProjectManager';
import { darkmode } from "./Service/Darkmode";
import { Start } from "./Start";
import isElectron from 'is-electron';
import is from 'electron-is';
import { ipcRenderer, shell } from "electron";

export class Title extends Component {

    state = {
        focus: true,
        isRunning: false,
        isProgrammToggle: false,
        runHz: 10,
        bitfile: '',
        isFileModalOpen: false,
        isNewModalOpen: false,
        isOpenModalOpen: false,
        isWarnModalOpen: false,
        isMaximized: false,
        isSettingDropdownOpen: false,
        titlePjName: '',
        newPjName: '',
        openPjName: '',
        isStartModalOpen: false,
        recentProjects: [],
        modified: false,
        iofile: '',
        pjdir: '',
        isDevSwitchChecked: false,
        isDarkSwitchChecked: -1
    }

    constructor(props) {
        super(props);

        ipcRenderer.on('window-state-maximize', this.onWindowStateMaximize);
        ipcRenderer.on('window-state-unmaximize', this.onWindowStateUnMaximize);
        ipcRenderer.on('window-state-blur', this.onWindowStateBlur);
        ipcRenderer.on('window-state-focus', this.onWindowStateFocus);
        ipcRenderer.on('open-project-callback', this.onOpenProjectCallback);
        ipcRenderer.on('open-bitfile-callback', this.onOpenBitfileCallback);
        ipcRenderer.on('open-project-save-folder-callback', this.onOpenNewPjDirCallback);
        ipcRenderer.on('open-project-io-file-callback', this.onOpenNewPjIOCallback);
        ipcRenderer.on('exit-callback', this.onExitCallback);
        ipcRenderer.on('window-state-darkmode', this.onWindowStateDarkmode);
    }

    onWindowStateDarkmode = (event, arg) => {
        console.log('Darkmode: '+arg)
        if (arg) {
            darkmode.ActivateDarkMode();
        } else {
            darkmode.DeactivateDarkMode();
        }
        this.setState({
            isDarkSwitchChecked: (arg ? 1 : 0)
        })
    }

    onExitCallback = (event, arg) => {
        window.close();
    }

    onWindowStateMaximize = (event, arg) => {
        console.log("maximized");
        this.setState({
            isMaximized: true
        });
    }

    onWindowStateUnMaximize = (event, arg) => {
        console.log("unmaximized");
        this.setState({
            isMaximized: false
        });
    }

    onWindowStateBlur = (event, arg) => {
        console.log("blur");
        this.setState({
            focus: false
        });
    }

    onWindowStateFocus = (event, arg) => {
        console.log("focus");
        this.setState({
            focus: true
        });
    }

    onOpenProjectCallback = async (event, arg) => {
        console.log('Open project file: '+arg);

        //??????????????????????????????????????????
        pjManager.projectFile = arg;
        await pjManager.SetProjectFile();

        //????????????,??????????????????
        window.location.reload(true);
    }

    onOpenBitfileCallback = (event, arg) => {
        console.log('Open Bitfile: '+arg);
        this.props.onModified(true);

        let path = arg;
        pjManager.bitfile = path
        this.setState({ bitfile: path });
    }

    componentWillReceiveProps(nextProps) {
        let data = nextProps.titleData;
        if (data != null) {
            this.setState(prevState => ({
                bitfile: prevState.bitfile === "" ? data.bitfile : prevState.bitfile,
                titlePjName: data.pjName,
                isStartModalOpen: !data.projectInitialize,
                recentProjects: data.recentProjects,
                isDarkSwitchChecked: prevState.isDarkSwitchChecked === -1 ? (data.isDarkMode ? 1 : 0) : prevState.isDarkSwitchChecked
            }));
        }
        this.setState({
            modified: nextProps.modified,
        })
    }


    OpenFileModal = (event) => {
        ipcRenderer.send('open-bitfile');
    }

    OnBitfileChange = (event) => {
        console.log(event.target.files[0]);
        this.props.onModified(true);

        if (isElectron()) {
            let path = event.target.files[0].path;
            pjManager.bitfile = path
            this.setState({ bitfile: path });
        } else {
            pjManager.bitfile = "E:\\Documents\\Repo\\ProjectFDB\\Wonton\\Wonton.Test\\AlarmClock_fde_dc.bit";
            this.setState({ bitfile: "E:\\Documents\\Repo\\ProjectFDB\\Wonton\\Wonton.Test\\AlarmClock_fde_dc.bit" });
        }
        // let inputObj = document.getElementById("_ef");

        // if (isElectron()) {
        //     this.setState({ bitfile: inputObj.files[0].path });
        // } else {
        //     this.setState({ bitfile: inputObj.files[0].name });
        // }

        // console.log(`Open bit file: ${inputObj.files[0].name}`);

        // inputObj.removeEventListener("change",function(){});
        // document.body.removeChild(inputObj);
    }

    FreqChange = (event) => {
        if (!this.state.isRunning) {
            this.setState({ runHz: event.target.value });
        }
    }

    ClickRun = async () => {

        if (this.state.isRunning) {      
            //??????????????????,?????????
            this.setState((prevState) => {
                return {
                    isRunning : !prevState.isRunning,
                }
            }, () => {});
        } else {
            //??????????????????, ???????????????
            this.setState((prevState) => {
                return {
                    isRunning : !prevState.isRunning,
                }
            }, () => {});

            let r = await this.RunFPGA();
            if (!r) { //????????????, ??????
                this.setState({isRunning: false});
            }
        }
    }

    RunFPGA = async () => {
        ipcRenderer.send('working-status',true);
        // await fetch('/api/window/working-state?state=1');

        await manager.InitIO(4, 4);
        let r = await manager.IoOpen();

        if (!r) {
            console.log("Init failed");
            ipcRenderer.send('working-status',false);
            return false;
        }

        console.log(`Run Frequency: ${this.state.runHz}`);

        while (this.state.isRunning)
        {            
            let wr = await manager.WriteReadData2();
            if (!wr) {
                //??????, ????????????
                ipcRenderer.send('working-status',false);
                return false;
            }

            manager.Cycle();

            if (this.state.runHz !== 0) {
                await this.sleep(1000 / this.state.runHz);
            } else {
                await this.sleep(1000);
            }
            
        }

        await manager.IoClose();
        ipcRenderer.send('working-status',false);
        // await fetch('/api/window/working-state?state=0');
        return true;
    }

    sleep = (time) => {
        return new Promise((resolve) => setTimeout(resolve, time));
    }

    ClickProgram = async () => {
        if (!this.state.isRunning) {
            await manager.Program(this.state.bitfile);
        } else {
            this.setState({
                isWarnModalOpen: true,
            });
        }
    }

    ClickProgrammToggle = () => {

        this.setState((prevState) => {
            return {
                isProgrammToggle : !prevState.isProgrammToggle,
            }
        }, () => {});
    }

    ClickWaveform = async () => {
        await pjManager.ShowWaveform(this.state.runHz);
    }

    ClickClose = () => {
        this.CloseApp();
    }

    ClickMaxRestore = async () => {
        ipcRenderer.send('window-status', 'maximize');
        // const response = await fetch('/api/window/maximize');
    }

    ClickMin = async () => {
        ipcRenderer.send('window-status', 'minimize');
        // const response = await fetch('/api/window/minimize');
    }

    NewPjToggle = (event) => {
        if (!this.state.isRunning) {
            this.setState((prevState) => {
                return {
                    isNewModalOpen: !prevState.isNewModalOpen
                }
            })
        } else {
            this.setState({
                isWarnModalOpen: true,
            });
        }
    }

    NewPj = async (event) => {
        await pjManager.NewProject(this.state.pjdir,this.state.newPjName,this.state.iofile);
        window.location.reload(true);
    }

    OnNewPjDirChange = (event) => {
        console.log(`New Project Dir: ${event.target.value}`);
        let path = event.target.value;
        this.setState({ pjdir: path });
    }

    onOpenNewPjDirCallback = (event, arg) =>{
        console.log(`New Project Dir: ${arg}`);
        let path = arg;
        this.setState({ pjdir: path });      
    }

    OnOpenNewPjDir = (event) => {
        ipcRenderer.send('open-project-save-folder');
    }

    OnNewPjNameChange = (event) => {
        console.log(`New Project Name: ${event.target.value}`);
        this.setState({
            newPjName: event.target.value
        })
    }

    OnNewPjIOfileChange = async (event) => {
        // if (isElectron()) {
        //     let path = event.target.files[0].path;
        //     this.setState({ iofile: path });
        // } else {
        //     let path = "F:\\Repo\\Wonton\\Wonton.Test\\AlarmClock.xml";
        //     this.setState({ iofile: path });
        // }

        console.log(`New Project IO File: ${event.target.value}`);
        this.setState({
            iofile: event.target.value
        })

        // if (isElectron()) {
            
        // } else {
        //     await pjManager.ReadProjectIO("E:\\Downloads\\VeriCommSDK-2019-11-22??????\\VeriCommSDK\\Example\\Alarm_Clock\\FDP3P7\\FDE\\src\\AlarmClock.xml");
        // }

    }

    onOpenNewPjIOCallback = (event, arg) => {
        let path = arg;
        this.setState({ iofile: path });
    }

    OnOpenNewPjIO = (event) => {
        ipcRenderer.send('open-project-io-file');
    }

    OpenPjToggle = async (event) => {
        if (!this.state.isRunning) {
            if (isElectron()) {
                ipcRenderer.send('open-project-file');
            } else {
                await this.onOpenProjectCallback({}, "F:\\Repo\\Wonton\\Wonton.Test\\haha4.hwproj")
            }
        } else {
            this.setState({
                isWarnModalOpen: true,
            });
        }
        // this.setState((prevState) => {
        //     return {
        //         isOpenModalOpen: !prevState.isOpenModalOpen
        //     }
        // })
    }

    // Open = (event) => {
    //     //????????????DOM????????????
    //     var inputObj = document.createElement('input');
    //     inputObj.setAttribute('id','_ef');
    //     inputObj.setAttribute('type','file');
    //     inputObj.setAttribute('style','visibility:hidden');
    //     document.body.appendChild(inputObj);
    //     inputObj.addEventListener("change",this.OnOpenfileChange);
    //     inputObj.click();
    // }

    OpenPj = async (event) => {
        //??????????????????????????????????????????
        pjManager.projectFile = this.state.openPjName;
        await pjManager.SetProjectFile();

        //????????????,??????????????????
        window.location.reload(true);
    }

    OnOpenfileChange = (event) => {
        // let inputObj = document.getElementById("_ef");

        let file = "F:\\Repo\\Wonton\\Wonton.Test\\haha.hwproj";
        if (isElectron()) {
            file = event.target.files[0].path;
        } else {
            
        }

        console.log(`Open project file: ${file}`);
        this.setState({
            openPjName: file
        })

        // inputObj.removeEventListener("change",function(){});
        // document.body.removeChild(inputObj);


    }

    Save = async (event) => {
        await pjManager.WriteProjectFile();
        this.props.onModified(false)
    }

    SettingToggle = (event) => {
        this.setState((prevState) => {
            return {
                isSettingDropdownOpen: !prevState.isSettingDropdownOpen
            }
        })
    }

    SettingToggle2 = (event) => {
        // console.log(event);
        //?????????MouseEvent???Toggle
        if (event instanceof MouseEvent) {
            this.SettingToggle({});
        }
    }

    DevToolsToggle = (event) => {
        ipcRenderer.send('dev-tools');
    }

    ToggleDevSwitchChecked = (checked) => {
        if (checked) {
            this.DevToolsToggle({});
        }
        this.setState({isDevSwitchChecked: checked});
    }

    ToggleDarkSwitchChecked = (checked) => {
        if (checked) {
            darkmode.ActivateDarkMode();
        } else {
            darkmode.DeactivateDarkMode();
        }
        this.setState({isDarkSwitchChecked: (checked ? 1 : 0)});
    }

    ClickAbout = (e) => {
        // const w = window.open('https://github.com/Hi2129/Wonton_master');
        shell.openExternal("https://github.com/Hi2129/Wonton_master");
    }

    CloseWarn = () => {
        this.setState({
            isWarnModalOpen: false,
        });
    }

    CloseApp = () => {
        if (this.state.isRunning)
        {
            this.setState({
                isWarnModalOpen: true,
            });
        }
        else if (this.state.modified) {
            ipcRenderer.send('show-unsave-prompt');
        }
        else {
            window.close();
        }
    }

    render() {

        const isRunning = this.state.isRunning;
        const runHz = this.state.runHz === 0 ? "" : this.state.runHz;
        const bitf = this.state.bitfile === "" ? "?????????Bit??????" : this.state.bitfile;

        let isMac = is.macOS(); //?????????MacOS??????????????????????????????
        let titleLeftMargin = isMac ? "80px" : "20px";
        let tempTitle = this.state.modified ? this.state.titlePjName+"*" : this.state.titlePjName;

        return (
            <CSSTransition in={this.state.focus} timeout={300} classNames="titleBaT">
            <div className="titleBar">

                <Modal isOpen={this.state.isStartModalOpen} centered fade={false}>
                    <ModalHeader toggle={this.CloseApp} >??????</ModalHeader>
                    <ModalBody>
                        <Start onOpen={this.OpenPjToggle} onNew={this.NewPjToggle} recentProjects={this.state.recentProjects}></Start>
                    </ModalBody>
                    </Modal>


                <div className="myTitle">
                    <div style={{ display: 'flex', alignItems: 'top', marginLeft: titleLeftMargin, marginTop: '8px'}}>
                        <FontAwesomeIcon style={{width:'20px', height:'20px', color: 'white', marginTop: "5px"}} icon={faCalculator}/>
                        <div className="titleName">??????FPGA</div>
                    </div>

                    <div className="pjTitle">{tempTitle}</div>

                    {isMac ? <div /> : 
                    <div className="clickTitle">
                        <a className="btn btn-min" href="/#" onClick={this.ClickMin}>
                            {/* <span className="systemIcon">&#xE921;</span> */}
                            <span className="systemIcon">&#xeaba;</span>
                        </a>
                        <a className="btn btn-max" href="/#" onClick={this.ClickMaxRestore}>
                            {/* <img src={this.state.isMaximized ? restore : maximize} /> */}
                            {this.state.isMaximized ? <span className="systemIcon">&#xeabb;</span> : <span className="systemIcon">&#xeab9;</span>}
                        </a>
                        {/* <div className="window-icon codicon codicon-chrome-maximize"></div> */}
                        <a className="btn btn-close" href="/#" onClick={this.ClickClose}>
                            {/* <img src={close} /> */}
                            <span className="systemIcon">&#xeab8;</span>
                            {/* <span className="systemIcon2">&#xe106;</span> */}
                        </a>
                    </div>
                    }
                    
                </div>
                <div className="navMenu">
                    <div style={{display: "flex", alignItems: 'center'}}>
                        <div style={{width: "10px"}}/>
                        <Button className="no-drag" onClick={(e) => this.props.onGalleryToggle()} size="sm">
                            <FontAwesomeIcon icon={faStore}></FontAwesomeIcon>
                        </Button>
                        <div style={{color: 'white', fontSize:'18px', marginLeft:"10px"}}>?????????</div>
                        <div style={{width: "30px"}}></div>
                        <ButtonGroup size="sm" className="no-drag">
                            <Button onClick={this.NewPjToggle}>
                                <FontAwesomeIcon icon={faPlus}></FontAwesomeIcon>
                            </Button>
                            <Button onClick={this.OpenPjToggle}>
                                <FontAwesomeIcon icon={faFolderOpen}></FontAwesomeIcon>
                            </Button>
                            <Button onClick={this.Save}>
                                <FontAwesomeIcon icon={faSave}></FontAwesomeIcon>
                            </Button>
                        </ButtonGroup>

                        {/* <Modal isOpen={this.state.isOpenModalOpen} toggle={this.OpenPjToggle} >
                            <ModalHeader toggle={this.OpenPjToggle}>????????????</ModalHeader>
                            <ModalBody>
                                <Input type='file' accept='.hwproj' onChange={this.OnOpenfileChange}></Input>
                            </ModalBody>
                            <ModalFooter>
                                <Button color="primary" onClick={this.OpenPj}>??????</Button>
                                <Button color="secondary" onClick={this.OpenPjToggle}>??????</Button>
                            </ModalFooter>
                        </Modal> */}
                        <Modal isOpen={this.state.isWarnModalOpen} toggle={this.CloseWarn}>
                            <ModalBody>Warning: ??????????????????????????????</ModalBody>
                        </Modal>
                        <Modal isOpen={this.state.isNewModalOpen} toggle={this.NewPjToggle} className="SquareModal" >
                            <ModalHeader >????????????</ModalHeader>
                            <ModalBody>
                                <div></div>
                                <InputGroup>
                                    <InputGroupAddon addonType="prepend">
                                        <InputGroupText>????????????</InputGroupText>
                                    </InputGroupAddon>
                                    <Input onChange={this.OnNewPjNameChange} value={this.state.newPjName}></Input>
                                </InputGroup>
                                
                                <div style={{marginTop: "10px"}}></div>
                                <InputGroup>
                                    <InputGroupAddon addonType="prepend">
                                        <InputGroupText>????????????</InputGroupText>
                                    </InputGroupAddon>
                                    <Input onChange={this.OnNewPjDirChange} value={this.state.pjdir}></Input>
                                    <InputGroupAddon addonType="append">
                                        <Button color="secondary" style={{width: "45px"}} onClick={this.OnOpenNewPjDir}>
                                            <FontAwesomeIcon icon={faFolderOpen}></FontAwesomeIcon>
                                        </Button>
                                    </InputGroupAddon>
                                </InputGroup>
                                <div style={{marginTop: "10px"}}></div>
                                <InputGroup>
                                    <InputGroupAddon addonType="prepend">
                                        <InputGroupText>????????????</InputGroupText>
                                    </InputGroupAddon>
                                    <Input onChange={this.OnNewPjIOfileChange} value={this.state.iofile}></Input>
                                    <InputGroupAddon addonType="append">
                                        <Button color="secondary" style={{width: "45px"}} onClick={this.OnOpenNewPjIO}>
                                            <FontAwesomeIcon icon={faFile}></FontAwesomeIcon>
                                        </Button>
                                    </InputGroupAddon>                                    
                                </InputGroup>
                            </ModalBody>
                            <ModalFooter style={{justifyContent: "flex-end"}}>
                                <Button color="info" onClick={this.NewPj} style={{width: "120px", borderRadius: "20px"}}>??????</Button>
                                <Button color="secondary" onClick={this.NewPjToggle} style={{width: "120px", borderRadius: "20px"}}>??????</Button>
                            </ModalFooter>
                        </Modal>
                    </div>

                    <div style={{display: "flex"}} className="no-drag">
                        <div>
                            <InputGroup size="sm">
                                <Input style={{width: "100px"}} placeholder="??????" value={runHz} type="number" onChange={this.FreqChange}/>
                                <InputGroupAddon addonType="append">
                                    <InputGroupText>Hz</InputGroupText>
                                </InputGroupAddon>
                            </InputGroup>
                        </div>
                        <div style={{width: "10px"}}/>
                        <Button className="no-drag" color={isRunning ? "success" : "info"} onClick={this.ClickRun} size="sm">
                            <FontAwesomeIcon icon={isRunning ? faStop : faPlay}/>
                        </Button>       

                    </div>

                    <div style={{display: "flex"}} className="no-drag">
                        <div>
                        <Button size="sm" onClick={this.ClickWaveform}>
                            <div style={{display:'flex', alignItems: 'center'}} >
                                <FontAwesomeIcon icon={faEye}/>
                                <div style={{marginLeft: '8px'}}>Waveform</div>
                            </div>
                        </Button>
                        </div>
                        <div style={{ width: "20px" }} />

                        <div>
                            <ButtonGroup size="sm">
                                <Button onClick={this.ClickProgram}>
                                    <div style={{display:'flex', alignItems: 'center'}} >
                                        <FontAwesomeIcon icon={faMicrochip}/>
                                        <div style={{marginLeft: '8px'}}>Program</div>
                                    </div>
                                </Button>
                                 <ButtonDropdown isOpen={this.state.isProgrammToggle} toggle={this.ClickProgrammToggle} >
                                    <DropdownToggle caret size="sm">

                                    </DropdownToggle> 
                                    {/* <CSSTransition in={this.state.isProgrammToggle} timeout={300} classNames="setting-dropdown"> */}
                                        <DropdownMenu right>
                                            <DropdownItem disabled>
                                                <div>{bitf}</div>
                                            </DropdownItem>
                                            <DropdownItem divider ></DropdownItem>
                                            <DropdownItem onClick={this.OpenFileModal}> 
                                                ????????????
                                            </DropdownItem> 
                                        </DropdownMenu> 
                                    {/* </CSSTransition> */}
                                </ButtonDropdown> 
                            </ButtonGroup>

                            {/* <Modal isOpen={this.state.isFileModalOpen} toggle={this.OpenFileModal}>
                                <ModalHeader toggle={this.OpenFileModal} >??????Bit??????</ModalHeader>
                                <ModalBody>
                                    <Input type='file' accept='.bit' onChange={this.OnBitfileChange}></Input>
                                </ModalBody>
                                <ModalFooter>
                                    <Button color="primary" onClick={this.OpenFileModal}>??????</Button>
                                    <Button color="secondary" onClick={this.OpenFileModal}>??????</Button>
                                </ModalFooter>
                            </Modal> */}
                            
                        </div>
                        
                        <div style={{width: "20px"}}/>
                        <ButtonGroup className="no-drag" size="sm">
                            <ButtonDropdown  isOpen={this.state.isSettingDropdownOpen} toggle={this.SettingToggle2}>
                                <DropdownToggle caret size="sm" onClick={this.SettingToggle}>
                                    <FontAwesomeIcon icon={faCog} style={{marginRight: "4px"}}/>
                                    ??????
                                </DropdownToggle>
                                <CSSTransition in={this.state.isSettingDropdownOpen} timeout={300} classNames="setting-dropdown">
                                    <DropdownMenu right>
                                        <DropdownItem header>??????</DropdownItem>
                                        <DropdownItem >
                                            <label className="dropdown-item-label">
                                                <span style={{marginRight:"8px"}}>????????????</span>
                                                <Switch onChange={this.ToggleDarkSwitchChecked} checked={this.state.isDarkSwitchChecked === 1 ? true : false} ></Switch>
                                            </label>
                                        </DropdownItem>
                                        <DropdownItem divider></DropdownItem>
                                        <DropdownItem header>??????</DropdownItem>
                                        <DropdownItem >
                                            <label className="dropdown-item-label">
                                                <span style={{marginRight:"8px"}}>???????????????</span>
                                                <Switch onChange={this.ToggleDevSwitchChecked} checked={this.state.isDevSwitchChecked} ></Switch>
                                            </label>
                                        </DropdownItem>
                                        <DropdownItem onClick={this.ClickAbout}>
                                            ??????
                                        </DropdownItem>
                                    </DropdownMenu>
                                </CSSTransition>
                            </ButtonDropdown>
                        </ButtonGroup>

                        <div style={{width: "20px"}}/>
                    </div>
                </div>
            </div>
            </CSSTransition>
        );
    }
}
