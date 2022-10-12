import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { useState, useEffect } from "react";
import Form from "react-bootstrap/Form";
import Multiselect from 'multiselect-react-dropdown';
import axios from "axios";
import Moment from 'moment';

function Home() {
  const [show, setShow] = useState(false);
  const [data, setData] = useState([]);
  const [interview, setInterview] = useState({});
  const [userList, setUserList] = useState([]);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const fetchAndSetData = () => {
    axios.get("http://localhost:3000/interview").then(({ data }) => {
      setData(data);
    });
  }

  const fetchAndSetUserList = () => {
    axios.get("http://localhost:3000/users").then(({ data }) => {
      setUserList(data);
    })
  }

  const deleteInterview = (id) => {
    axios.delete("http://localhost:3000/interview", {
      data: {
        id
      }
    }).then(() => {
      fetchAndSetData();
    });
  }

  const openInEditMode = (dt) => {
    dt.fl = 1;
    setInterview(dt);
    handleShow();
  }

  useEffect(() => {
    fetchAndSetData();
    fetchAndSetUserList();
  }, []);

  const submitInterview = (event) => {
    // check if interview is being updated
    if (interview.fl) {
      axios.put("http://localhost:3000/interview", {...interview}).then(() => {
        fetchAndSetData();
      })
    } else {
      // Create new interview
      axios.post("http://localhost:3000/interview", {...interview}).then(() => {
        fetchAndSetData();
      });
    }
    event.preventDefault();
    handleClose();
    setInterview({});
  }

  return (
    <>
      <div
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.75), rgba(255,255,255,.75)), url(/hero-bg.jpg)",
        }}
        className="container-fluid main"
      >
        <div className="row rw">
          <div className="offset-md-2 col-md-8 offset-1 col-10">
            <h1 className="urlName">Welcome to Scaler Interview Scheduler!!</h1>
          </div>
        </div>
        {data.map((dt) => {
          return (
            <div key={dt.id} className="row mt-5">
              <div className="link">  
                <div className="offset-1 col-10 urlBox">
                  <div className="row mb-3">
                    <h4>{dt.title}</h4>
                    <h6>Start Time - {Moment(dt.startTime).format("MMMM Do YYYY, h:mm a")} </h6>
                    <h6>End Time - {Moment(dt.endTime).format("MMMM Do YYYY, h:mm a")} </h6>
                    <h6>Participants - {dt.participants.map(({EmailID}, index) => <span className="badge bg-secondary" key={index} style={{marginRight: "5px"}}>{EmailID}</span>)}</h6>
                    </ div>
                    <div className="row">
                      <Button className="button offset-1 col-4" variant="info" onClick={() => {openInEditMode(dt)}}>Edit</Button>
                      <Button className="button offset-2 col-4" variant="danger" onClick={() => deleteInterview(dt.id)}>Delete</Button>
                  </div>
                </div>
              </div>
            </div>
          );
        }).reverse()}
      </div>
      <Button className="button plus-button" variant="primary" onClick={handleShow}>
        +
      </Button>
      <Modal show={show} onHide={handleClose}>
        <Modal.Header>
          <Modal.Title>Add/Update interview details</Modal.Title>
          <button className="btn-close" onClick={handleClose}></button>
        </Modal.Header>
        <Modal.Body>
          <Form id="interview" onSubmit={submitInterview}>
            <Form.Group className="mb-3" controlId="formTitle">
              <Form.Label>Title</Form.Label>
              <Form.Control type="text" placeholder="Enter title" value={interview.title || ""} onChange = {(event) => {setInterview({...interview, title: event.target.value})}}/>
            </Form.Group>
            <Form.Group className="mb-3" controlId="formStartDate">
              <Form.Label>Start Date</Form.Label>
              <Form.Control type="datetime-local" placeholder="Enter interview start time" value={interview.startTime || ""} onChange = {(event) => {setInterview({...interview, startTime: event.target.value})}}/>
            </Form.Group>
            <Form.Group className="mb-3" controlId="formEndDate">
              <Form.Label>End Date</Form.Label>
              <Form.Control type="datetime-local" placeholder="Enter interview end time" value={interview.endTime || ""} onChange = {(event) => {setInterview({...interview, endTime: event.target.value})}}/>
            </Form.Group>
            <Form.Group className="mb-3" controlId="formEndDate">
              <Form.Label>Participants</Form.Label>
              <Multiselect
                options={userList} // Options to display in the dropdown
                selectedValues={interview.participants || []} // Preselected value to persist in dropdown
                onSelect={(value) => {setInterview({...interview, participants: value})}} // Function will trigger on select event
                onRemove={(value) => {setInterview({...interview, participants: value})}} // Function will trigger on remove event
                displayValue="EmailID"
                />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" form="interview" type="submit">
            Submit
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default Home;
