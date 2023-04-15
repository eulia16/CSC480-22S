import React, { useEffect, useState } from "react";
import classes from "./styles/DisplayMatrix.module.css"
import AssignmentDropdown from "../../components/AssignmentDropdown";
import axios from "axios";
import Breadcrumbs from "../../components/Breadcrumbs";
import SidebarComponent from '../../components/SidebarComponent';


const DisplayMatrix = (props) => {
    const [matrixData, setMatrixData] = useState([]);
    const [trueMatrix, setTrueMatrix] = useState(undefined);
    const [lastUpdated, setLastUpdates] = useState(new Date().getTime());
    const [assignmentData, setAssignmentData] = useState([]);
    const [chosenAssignment, setChosenAssignment] = useState(``);
    const [chosenAssignmentIndex, setChosenAssignmentIndex] = useState(0);
    const [courseTeams, setCourseTeams] = useState([]);
    const [outlierCount, setOutlierCount] = useState(0);


    axios.defaults.headers.common['Authorization'] = `Bearer ${localStorage.getItem("jwt_token")}`;

    /**
     * Sends a GET rquest to retrieve the data that will populate the matrix.
     *
     * @returns an array containing objects that represent the information that will populate the matrix.
     */
    const getMatrixData = async () => {
        const courseId = window.location.href.split("/")[-1];
        const requestUrl = `${process.env.REACT_APP_URL}/peer-review/assignments/${courseId}/${chosenAssignmentIndex + 1}/matrix`;
        try {
            const response = await axios.get(requestUrl);
            const data = response.data;
            setTrueMatrix(data);
            const arr = [];
            for (const prop in data) {
                const reviewedTeam = prop;
                const actualData = data[prop];
                const reviewingTeam = Object.keys(actualData)[0];
                const grade = Object.keys(actualData[reviewingTeam])[0];
                const isOutlier = actualData[reviewingTeam][grade];
                let averageIsOutlier = actualData[Object.keys(actualData)[1]];
                const avgGrade = Object.keys(averageIsOutlier)[0];
                averageIsOutlier = averageIsOutlier[avgGrade];
                const review = {
                    reviewedTeam: reviewedTeam,
                    reviewingTeam: reviewingTeam,
                    grade: grade,
                    isOutlier: isOutlier,
                    averageIsOutlier: averageIsOutlier
                };
                arr.push(review);
            }
            arr.pop();
            setMatrixData(arr);
            return arr;
        } catch (err) {
            console.log(err);
        }
    };

    /**
     * Sends a GET request to retrive the data for all assignments in the given course.
     *
     * @returns an array containing objects representing the data for each assignment in the course
     */
    const getAssignmentData = async () => {
        const courseId = window.location.href.split("/")[-1];
        // const requestUrl = `http://localhost:3000/assignments/professor/courses/${courseName}/assignments`;
        const requestUrl = `${process.env.REACT_APP_URL}/assignments/professor/courses/${courseId}/assignments`;
        try {
            const response = await axios.get(requestUrl);
            const data = response.data;
            setAssignmentData(data);
            return data;
        } catch (err) {
            console.log(err);
        }
    };

    /**
     * Calculates the sum of an interable of numbers.
     *
     * @returns the sum of the iterable
     */
    const sum = (iterable) => {
        let sum = 0;
        iterable.forEach(element => sum += element["grade"]);
        return sum;
    };

    /**
     * @returns an array of JSX elements representing one row in the matrix
     */
    const gradesToJSX = (gradesReceived, averageReceived, teamName, rowNumber, color, receivedOutlier) => {
        let arr = gradesReceived.map(grade => {
            let className = color === 'gray' ? classes.gray : classes.white;
            if (grade.isOutlier) className = classes.red;
            return (
            <td className={className}> {grade.grade} </td>
            )
        });
        let className = color === 'gray' ? classes.gray : classes.white;
        if (receivedOutlier[teamName]) className = classes.red;
        arr.push(<td className={className}>{averageReceived[teamName]}</td>)
        arr.splice(rowNumber, 0, (<td className={classes.emptyBrick}></td>));
        return (
            <tr>
                 <td className={classes.columnName}>{teamName}</td>
                 { arr }
             </tr>
         );
     };

     /**
      * @returns an array representing the entire matrix
      */
    const dataToMatrix = () => {
        const tableData = [];
        const averageGiven = {};
        const averageReceived = {};
        const gradesReceived = {};
        const gradesGiven = {};
        const averageReceivedIsOutlier = {};
        const averageGivenIsOutlier = {};

        /* Populate the above maps */
        for (const peerReview of matrixData) {
            const reviewingTeam = peerReview["reviewingTeam"];
            const reviewedTeam = peerReview["reviewedTeam"];
            const grade = peerReview.grade;
            const isOutlier = peerReview.isOutlier;

            /* Update the grades received hash table */
            const currentGradesReceived = reviewedTeam in gradesReceived ? gradesReceived[reviewedTeam] : [];
            currentGradesReceived.push({ team: reviewingTeam, grade: grade, isOutlier: isOutlier });
            gradesReceived[reviewedTeam] = currentGradesReceived;

            /* Update the grades given hash table */
            const currentGradesGiven = reviewingTeam in gradesGiven ? gradesGiven[reviewingTeam] : [];
            currentGradesGiven.push({ reviewedTeam: reviewedTeam, grade: grade });
            gradesGiven[reviewingTeam] = currentGradesGiven;

            /* Update the average received hash table */
            averageReceived[reviewedTeam] = sum(currentGradesReceived) / currentGradesReceived.length;
            averageReceivedIsOutlier[reviewedTeam] = peerReview["averageIsOutlier"];

            /* Update the average given hash table */
            averageGiven[reviewingTeam] = sum(currentGradesGiven) / currentGradesGiven.length;
        }

        /* Generate the element maps and append them to tableData */
        let i = 0;
        for (const team of courseTeams) {
            tableData.push(gradesToJSX(gradesReceived[team], averageReceived, team, i, i % 2 === 0 ? "white" : "gray", averageReceivedIsOutlier));
            ++i;
        }

        tableData.unshift(<tr><td className={classes.columnName + " " + classes.topLeft}></td>{courseTeams.map(team => <td className={classes.columnName}>{team}</td>)}<td className={classes.columnName}>Avg. Received</td></tr>)

        const lastRow = <tr>
            <td className={classes.columnName}>Avg. Given</td>
            {courseTeams.map(team => {
                const className = averageReceivedIsOutlier[team] ? classes.red : classes.average;
                return (
                    <td className={className}>{averageGiven[team]}</td>
                )
            })}
            <td className={classes.emptyBrick}></td>
        </tr>;
        tableData.push(lastRow);
        return tableData;
    };


    useEffect(() => {
        let matrixDatum = undefined;
        let assignments = undefined;
        let teamList = undefined;

        getMatrixData()
            .then(matrix => {
                matrixDatum = matrix;
                console.log(matrixDatum, "matrix datum");
                return matrix;
            })
            .then(matrix => {
                return getAssignmentData();
            })
            .then(assignmentDatum => {
                assignments = assignmentDatum;
                return assignments;
            })
            .then(assignmentDatum => {
                const teams = [];
                for (const entry of matrixDatum) {
                    teams.push(entry["reviewedTeam"]);
                    }
            teamList = teams;
            setCourseTeams(teams);

            let outliers = 0;
            for (const prop in matrixDatum) {
                for (const propProp in prop) {
                    if (propProp === "Average Grade Received") continue;
                    for (const propPropProp in propProp) {
                        if (propProp[propPropProp] === true) {
                            outliers += 1;
                        }
                    }
                }
            }
            return 5
        })
            .catch(err => console.log(err));
    }, []);


    return (
        <div className={classes.container}>
            <Breadcrumbs />
            <SidebarComponent />
        {matrixData && assignmentData && trueMatrix &&
            <>
                <h1>Peer Review Distribution</h1>
                <AssignmentDropdown setMatrixState={() => setLastUpdates(new Date().getTime())} assignmentObjects={assignmentData} />
                <h1>{chosenAssignment}</h1>
                <table className={classes.table} cellSpacing={0}>
                    {dataToMatrix()}
                </table>
              <a className={classes.box + " " + classes.red}> </a>
            <p className={classes.outlier_desc}>Outliers Detected</p>
            <div className={classes.warningDiv}>
            <p><strong>{outlierCount} Outliers Detected </strong> <br></br><a className={classes.review}>Click here to review</a></p>
            </div>
         </>
        }
        </div>
    )
}