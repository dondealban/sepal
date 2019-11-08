import {compose} from 'compose'
import {connect, select} from 'store'
import {msg} from 'translate'
import React from 'react'
import format from 'format'
import styles from './userResources.module.css'

const mapStateToProps = () => ({
    userReport: select('user.currentUserReport'),
})

class UserResources extends React.Component {
    render() {
        const {spending} = this.props.userReport
        return (
            <table className={styles.resources}>
                <thead>
                    <tr>
                        <th></th>
                        <th className={styles.quota}>{msg('user.report.resources.quota')}</th>
                        <th className={styles.used}>{msg('user.report.resources.used')}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th>{msg('user.report.resources.monthlyInstance')}</th>
                        <td className={styles.number}>{format.dollars(spending.monthlyInstanceBudget)}</td>
                        <td className={styles.number}>{format.dollars(spending.monthlyInstanceSpending)}</td>
                        <PercentCell used={spending.monthlyInstanceSpending} budget={spending.monthlyInstanceBudget}/>
                    </tr>
                    <tr>
                        <th>{msg('user.report.resources.monthlyStorage')}</th>
                        <td className={styles.number}>{format.dollars(spending.monthlyStorageBudget)}</td>
                        <td className={styles.number}>{format.dollars(spending.monthlyStorageSpending)}</td>
                        <PercentCell
                            used={spending.monthlyStorageSpending}
                            budget={spending.monthlyStorageBudget}
                            level={spending.projectedStorageSpending > spending.monthlyStorageBudget
                                ? 'medium'
                                : undefined
                            }/>
                    </tr>
                    <tr>
                        <th>{msg('user.report.resources.storage')}</th>
                        <td className={styles.number}>{format.number({value: spending.storageQuota, scale: 'G', unit: 'B'})}</td>
                        <td className={styles.number}>{format.number({value: spending.storageUsed, scale: 'G', unit: 'B'})}</td>
                        <PercentCell used={spending.storageUsed} budget={spending.storageQuota}/>
                    </tr>
                </tbody>
            </table>
        )
    }
}

export default compose(
    UserResources,
    connect(mapStateToProps)
)

const PercentCell = ({used, budget, level=null}) => {
    const ratio = used / budget
        if (ratio >= 1)
            level = 'high'
        else if (ratio > 0.75 && level !== 'high')
            level = 'medium'
        else if (!level)
            level = 'low'
    return <td className={[styles.percent, styles[level]].join(' ')}>
        {format.percent(used, budget, 0)}
    </td>
}
